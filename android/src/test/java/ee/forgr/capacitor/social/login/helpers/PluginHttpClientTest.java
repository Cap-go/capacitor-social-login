package ee.forgr.capacitor.social.login.helpers;

import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 28)
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
        final int writeTimeoutMs = 200;
        final int readTimeoutMs = 5_000;
        PluginHttpClient client = new PluginHttpClient(200, readTimeoutMs, writeTimeoutMs);
        assertTrue(readTimeoutMs > writeTimeoutMs);
        assertTrue(client.requestDeadlineMs() > writeTimeoutMs);

        ServerSocket serverSocket = new ServerSocket(0);
        int port = serverSocket.getLocalPort();
        Thread serverThread = new Thread(
            () -> {
                try (Socket socket = serverSocket.accept()) {
                    // Never read so the client upload blocks once the TCP buffer fills.
                    Thread.sleep(10_000);
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

        byte[] uploadBody = new byte[1024 * 1024];
        try (Socket uploadSocket = new Socket()) {
            uploadSocket.connect(new InetSocketAddress("127.0.0.1", port), 2_000);
            SocketTimeoutException failure = assertThrows(
                SocketTimeoutException.class,
                () -> PluginHttpClient.writeBodyWithTimeout(uploadSocket.getOutputStream(), uploadBody, writeTimeoutMs, null)
            );
            assertTrue(
                failure.getMessage() != null && failure.getMessage().contains("Request body write timed out after " + writeTimeoutMs + "ms")
            );
        } finally {
            serverSocket.close();
            serverThread.interrupt();
            serverThread.join(2_000);
        }
    }
}
