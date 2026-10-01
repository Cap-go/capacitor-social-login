package ee.forgr.capacitor.social.login.helpers;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Minimal async HTTP client using {@link HttpURLConnection} (replaces OkHttp for plugin HTTP calls).
 */
public final class PluginHttpClient {

    public static final PluginHttpClient DEFAULT = new PluginHttpClient(10_000, 10_000, 10_000);
    public static final PluginHttpClient THIRTY_SECOND_TIMEOUTS = new PluginHttpClient(30_000, 30_000, 30_000);

    private static final ExecutorService EXECUTOR = Executors.newCachedThreadPool();

    private final int connectTimeoutMs;
    private final int readTimeoutMs;
    private final int writeTimeoutMs;

    public PluginHttpClient(int connectTimeoutMs, int readTimeoutMs, int writeTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
        this.readTimeoutMs = readTimeoutMs;
        this.writeTimeoutMs = writeTimeoutMs;
    }

    public interface Callback {
        void onFailure(IOException e);

        void onResponse(int code, String body) throws IOException;
    }

    public void enqueueGet(String url, Map<String, String> headers, Callback callback) {
        enqueue("GET", url, null, headers, callback);
    }

    public void enqueuePostForm(String url, Map<String, String> formFields, Map<String, String> headers, Callback callback) {
        enqueue("POST", url, formFields, headers, callback);
    }

    private void enqueue(String method, String url, Map<String, String> formFields, Map<String, String> headers, Callback callback) {
        EXECUTOR.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = openConnection(url, method, formFields, headers);
                int code = connection.getResponseCode();
                String body = readBody(connection, code);
                callback.onResponse(code, body);
            } catch (IOException e) {
                callback.onFailure(e);
            } catch (RuntimeException e) {
                callback.onFailure(new IOException(e));
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    private HttpURLConnection openConnection(String urlString, String method, Map<String, String> formFields, Map<String, String> headers)
        throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setConnectTimeout(connectTimeoutMs);
        connection.setReadTimeout(readTimeoutMs);
        applyWriteTimeout(connection, writeTimeoutMs);
        connection.setRequestMethod(method);
        connection.setUseCaches(false);
        if (headers != null) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                connection.setRequestProperty(entry.getKey(), entry.getValue());
            }
        }

        if ("POST".equals(method) && formFields != null) {
            connection.setDoOutput(true);
            if (headers == null || !containsHeaderIgnoreCase(headers, "Content-Type")) {
                connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
            }
            byte[] body = encodeFormBody(formFields);
            connection.setFixedLengthStreamingMode(body.length);
            try (OutputStream out = connection.getOutputStream()) {
                out.write(body);
            }
        }

        return connection;
    }

    private static void applyWriteTimeout(HttpURLConnection connection, int writeTimeoutMs) {
        try {
            connection.getClass().getMethod("setWriteTimeout", int.class).invoke(connection, writeTimeoutMs);
        } catch (ReflectiveOperationException ignored) {
            // HttpURLConnection.setWriteTimeout is API 26+; minSdk 24 builds omit it at compile time.
        }
    }

    private static boolean containsHeaderIgnoreCase(Map<String, String> headers, String name) {
        for (String key : headers.keySet()) {
            if (key != null && key.equalsIgnoreCase(name)) {
                return true;
            }
        }
        return false;
    }

    static byte[] encodeFormBody(Map<String, String> formFields) throws IOException {
        StringBuilder encoded = new StringBuilder();
        for (Map.Entry<String, String> entry : formFields.entrySet()) {
            if (encoded.length() > 0) {
                encoded.append('&');
            }
            encoded.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8.name()));
            encoded.append('=');
            encoded.append(URLEncoder.encode(entry.getValue() != null ? entry.getValue() : "", StandardCharsets.UTF_8.name()));
        }
        return encoded.toString().getBytes(StandardCharsets.UTF_8);
    }

    private static String readBody(HttpURLConnection connection, int code) throws IOException {
        InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        if (stream == null) {
            return "";
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            char[] buffer = new char[4096];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, read);
            }
            return sb.toString();
        }
    }

    public static boolean isSuccessfulHttpCode(int code) {
        return code >= 200 && code < 300;
    }
}
