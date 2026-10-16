package ee.forgr.capacitor.social.login.helpers;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Minimal async HTTP client using {@link HttpURLConnection} (replaces OkHttp for plugin HTTP calls).
 */
public final class PluginHttpClient {

    private static final int EXECUTOR_THREADS = 4;
    private static final int MAX_REDIRECT_HOPS = 5;

    public static final PluginHttpClient DEFAULT = new PluginHttpClient(10_000, 10_000, 10_000);
    public static final PluginHttpClient THIRTY_SECOND_TIMEOUTS = new PluginHttpClient(30_000, 30_000, 30_000);

    private static final ExecutorService EXECUTOR = Executors.newFixedThreadPool(EXECUTOR_THREADS);

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

    int requestDeadlineMs() {
        return connectTimeoutMs + writeTimeoutMs + readTimeoutMs;
    }

    private void enqueue(String method, String url, Map<String, String> formFields, Map<String, String> headers, Callback callback) {
        EXECUTOR.execute(() -> {
            final int requestDeadlineMs = requestDeadlineMs();
            final AtomicReference<HttpURLConnection> connectionRef = new AtomicReference<>();
            final int[] responseCode = new int[1];
            final String[] responseBody = new String[1];
            final IOException[] error = new IOException[1];

            Thread worker = new Thread(
                () -> {
                    HttpURLConnection connection = null;
                    try {
                        if ("POST".equals(method) && formFields != null) {
                            ExchangeResult result = performPostFormExchange(url, formFields, headers);
                            responseCode[0] = result.code;
                            responseBody[0] = result.body;
                        } else {
                            connection = openConnection(url, method, formFields, headers);
                            connectionRef.set(connection);
                            int code = connection.getResponseCode();
                            responseCode[0] = code;
                            responseBody[0] = readBody(connection, code);
                        }
                    } catch (IOException e) {
                        error[0] = e;
                    } catch (RuntimeException e) {
                        error[0] = new IOException(e);
                    } finally {
                        if (connection != null) {
                            connection.disconnect();
                        }
                    }
                },
                "PluginHttpClient-request"
            );
            worker.start();
            try {
                worker.join(requestDeadlineMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                HttpURLConnection connection = connectionRef.get();
                if (connection != null) {
                    connection.disconnect();
                }
                worker.interrupt();
                callback.onFailure(new IOException("Request interrupted", e));
                return;
            }
            if (worker.isAlive()) {
                worker.interrupt();
                HttpURLConnection connection = connectionRef.get();
                if (connection != null) {
                    connection.disconnect();
                }
                callback.onFailure(new SocketTimeoutException("Request timed out after " + requestDeadlineMs + "ms"));
                return;
            }
            if (error[0] != null) {
                callback.onFailure(error[0]);
                return;
            }
            try {
                callback.onResponse(responseCode[0], responseBody[0]);
            } catch (IOException e) {
                callback.onFailure(e);
            } catch (RuntimeException e) {
                callback.onFailure(new IOException(e));
            }
        });
    }

    private static final class ExchangeResult {
        final int code;
        final String body;

        ExchangeResult(int code, String body) {
            this.code = code;
            this.body = body;
        }
    }

    private ExchangeResult performPostFormExchange(String urlString, Map<String, String> formFields, Map<String, String> headers)
        throws IOException {
        URL originalUrl = new URL(urlString);
        byte[] body = encodeFormBody(formFields);
        String currentUrl = urlString;

        for (int hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
            HttpURLConnection connection = openPostFormConnection(currentUrl, body, headers);
            try {
                int code = connection.getResponseCode();
                if (isRedirectStatus(code) && hop < MAX_REDIRECT_HOPS) {
                    String location = connection.getHeaderField("Location");
                    if (location == null || location.isEmpty()) {
                        return new ExchangeResult(code, readBody(connection, code));
                    }
                    URL destination = resolveRedirectUrl(new URL(currentUrl), location);
                    if (!isSafeRedirectDestination(originalUrl, destination)) {
                        throw new IOException("Refusing redirect to unsafe destination: " + destination);
                    }
                    if (code != 307 && code != 308) {
                        throw new IOException("POST form request cannot follow HTTP " + code + " redirect without losing credentials");
                    }
                    currentUrl = destination.toString();
                    continue;
                }
                return new ExchangeResult(code, readBody(connection, code));
            } finally {
                connection.disconnect();
            }
        }
        throw new IOException("Too many HTTP redirects (max " + MAX_REDIRECT_HOPS + ")");
    }

    static boolean isRedirectStatus(int code) {
        return code == HttpURLConnection.HTTP_MOVED_PERM
            || code == HttpURLConnection.HTTP_MOVED_TEMP
            || code == 303
            || code == 307
            || code == 308;
    }

    static URL resolveRedirectUrl(URL base, String location) throws IOException {
        return new URL(base, location);
    }

    /**
     * OAuth form posts must not follow redirects to a different host or downgrade HTTPS.
     */
    static boolean isSafeRedirectDestination(URL original, URL destination) {
        if (destination == null) {
            return false;
        }
        if (destination.getUserInfo() != null) {
            return false;
        }
        String originalHost = original.getHost();
        String destinationHost = destination.getHost();
        if (originalHost == null || destinationHost == null || originalHost.isEmpty() || destinationHost.isEmpty()) {
            return false;
        }
        if (!originalHost.equalsIgnoreCase(destinationHost)) {
            return false;
        }
        if ("https".equalsIgnoreCase(original.getProtocol()) && !"https".equalsIgnoreCase(destination.getProtocol())) {
            return false;
        }
        return true;
    }

    private HttpURLConnection openPostFormConnection(String urlString, byte[] body, Map<String, String> headers) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(connectTimeoutMs);
        connection.setReadTimeout(readTimeoutMs);
        connection.setRequestMethod("POST");
        connection.setUseCaches(false);
        if (headers != null) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                connection.setRequestProperty(entry.getKey(), entry.getValue());
            }
        }
        connection.setDoOutput(true);
        connection.setFixedLengthStreamingMode(body.length);
        if (headers == null || !containsHeaderIgnoreCase(headers, "Content-Type")) {
            connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        }
        try (OutputStream out = connection.getOutputStream()) {
            writeBodyWithTimeout(out, body, writeTimeoutMs, connection);
        }
        return connection;
    }

    private HttpURLConnection openConnection(String urlString, String method, Map<String, String> formFields, Map<String, String> headers)
        throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlString).openConnection();
        connection.setInstanceFollowRedirects(true);
        connection.setConnectTimeout(connectTimeoutMs);
        connection.setReadTimeout(readTimeoutMs);
        connection.setRequestMethod(method);
        connection.setUseCaches(false);
        if (headers != null) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                connection.setRequestProperty(entry.getKey(), entry.getValue());
            }
        }

        return connection;
    }

    /**
     * HttpURLConnection has no write timeout on Android; run the body write on a worker thread and bound wait time.
     */
    static void writeBodyWithTimeout(OutputStream out, byte[] body, int writeTimeoutMs, HttpURLConnection connection) throws IOException {
        if (writeTimeoutMs <= 0) {
            out.write(body);
            out.flush();
            return;
        }

        final IOException[] writeError = new IOException[1];
        Thread writeThread = new Thread(
            () -> {
                try {
                    out.write(body);
                    out.flush();
                } catch (IOException e) {
                    writeError[0] = e;
                }
            },
            "PluginHttpClient-write"
        );
        writeThread.start();
        try {
            writeThread.join(writeTimeoutMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            if (connection != null) {
                connection.disconnect();
            }
            throw new IOException("Request body write interrupted", e);
        }
        if (writeThread.isAlive()) {
            writeThread.interrupt();
            if (connection != null) {
                connection.disconnect();
            }
            try {
                writeThread.join(1_000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            throw new SocketTimeoutException("Request body write timed out after " + writeTimeoutMs + "ms");
        }
        if (writeError[0] != null) {
            throw writeError[0];
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
