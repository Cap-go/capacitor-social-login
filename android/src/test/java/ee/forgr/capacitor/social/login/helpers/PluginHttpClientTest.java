package ee.forgr.capacitor.social.login.helpers;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
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
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", (exchange) -> {
            try {
                Thread.sleep(60_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
        int port = server.getAddress().getPort();
        String url = "http://127.0.0.1:" + port + "/";

        PluginHttpClient client = new PluginHttpClient(200, 200, 200);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<IOException> failure = new AtomicReference<>();

        client.enqueuePostForm(
            url,
            Collections.singletonMap("grant_type", "client_credentials"),
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
        server.stop(0);
        assertNotNull(failure.get());
        assertTrue(failure.get() instanceof SocketTimeoutException);
    }
}
