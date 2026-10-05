package ee.forgr.capacitor.social.login.helpers;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.Collections;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

public class PluginHttpClientTest {

    @Test
    public void writeBodyWithTimeoutCompletesSmallWrite() throws IOException {
        final byte[][] captured = new byte[1][];
        OutputStream out = new OutputStream() {
            @Override
            public void write(int b) {
                // no-op
            }

            @Override
            public void write(byte[] b, int off, int len) {
                captured[0] = new byte[len];
                System.arraycopy(b, off, captured[0], 0, len);
            }
        };

        byte[] body = "grant_type=client_credentials".getBytes();
        PluginHttpClient.writeBodyWithTimeout(out, body, 2_000, null);
        assertTrue(captured[0] != null && captured[0].length == body.length);
    }

    @Test
    public void writeBodyWithTimeoutFailsWhenWriteBlocksTooLong() {
        OutputStream out = new OutputStream() {
            @Override
            public void write(int b) throws IOException {
                block();
            }

            @Override
            public void write(byte[] b, int off, int len) throws IOException {
                block();
            }

            private void block() throws IOException {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IOException("interrupted", e);
                }
            }
        };

        assertThrows(SocketTimeoutException.class, () -> PluginHttpClient.writeBodyWithTimeout(out, new byte[] { 1 }, 50, null));
    }

    @Test
    public void postFormTimesOutWhenServerStallsReadingBody() throws Exception {
        ServerSocket serverSocket = new ServerSocket(0);
        int port = serverSocket.getLocalPort();
        Thread serverThread = new Thread(
            () -> {
                try (Socket socket = serverSocket.accept()) {
                    // Never read the request body so the client write blocks once the socket buffer fills.
                    Thread.sleep(2_000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (IOException ignored) {
                    // Server socket closed after the client times out.
                }
            },
            "PluginHttpClientTest-server"
        );
        serverThread.setDaemon(true);
        serverThread.start();

        String url = "http://127.0.0.1:" + port + "/";
        // Read timeout is longer than write timeout so a stalled upload fails on write, not read.
        PluginHttpClient client = new PluginHttpClient(200, 5_000, 200);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<IOException> failure = new AtomicReference<>();

        try {
            String largeField = "x".repeat(512 * 1024);
            client.enqueuePostForm(
                url,
                Collections.singletonMap("grant_type", largeField),
                null,
                new PluginHttpClient.Callback() {
                    @Override
                    public void onFailure(IOException e) {
                        failure.set(e);
                        latch.countDown();
                    }

                    @Override
                    public void onResponse(int code, String body) {
                        latch.countDown();
                    }
                }
            );

            assertTrue(latch.await(15, TimeUnit.SECONDS));
            assertNotNull(failure.get());
            assertTrue(failure.get() instanceof SocketTimeoutException);
            assertTrue(
                failure.get().getMessage() != null && failure.get().getMessage().contains("Request body write timed out after 200ms")
            );
        } finally {
            serverSocket.close();
            serverThread.interrupt();
            serverThread.join(2_000);
        }
    }
}
