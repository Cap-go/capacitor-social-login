package ee.forgr.capacitor.social.login;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

public class TwitterLoginActivity extends Activity {

    public static final String EXTRA_AUTH_URL = "authUrl";
    public static final String EXTRA_REDIRECT_URL = "redirectUrl";

    private String redirectUrl;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        redirectUrl = getIntent().getStringExtra(EXTRA_REDIRECT_URL);
        final String authUrl = getIntent().getStringExtra(EXTRA_AUTH_URL);

        webView.setWebViewClient(
            new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    return handleUrl(url);
                }

                @RequiresApi(21)
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return handleUrl(request.getUrl().toString());
                }

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    handleUrl(url);
                }
            }
        );

        setContentView(webView);

        if (authUrl == null) {
            finishWithError("Missing authorization URL");
            return;
        }

        webView.loadUrl(authUrl);
    }

    private boolean handleUrl(String url) {
        if (redirectUrl != null && url.startsWith(redirectUrl)) {
            Uri uri = Uri.parse(url);
            Intent data = new Intent();
            data.putExtra("code", uri.getQueryParameter("code"));
            data.putExtra("state", uri.getQueryParameter("state"));
            data.putExtra("error", uri.getQueryParameter("error"));
            data.putExtra("error_description", uri.getQueryParameter("error_description"));
            setResult(Activity.RESULT_OK, data);
            finish();
            return true;
        }
        return false;
    }

    private void finishWithError(String message) {
        Intent data = new Intent();
        data.putExtra("error", message);
        setResult(Activity.RESULT_CANCELED, data);
        finish();
    }

    @Override
    public void onBackPressed() {
        finishWithError("User cancelled");
    }
}
