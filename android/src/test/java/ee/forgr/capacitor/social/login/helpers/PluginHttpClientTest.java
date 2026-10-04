package ee.forgr.capacitor.social.login.helpers;

import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.io.OutputStream;
import java.net.SocketTimeoutException;
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
}
