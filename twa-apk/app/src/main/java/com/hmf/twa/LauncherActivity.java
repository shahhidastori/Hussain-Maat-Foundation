package com.hmf.twa;

import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import androidx.browser.trusted.TrustedWebActivityIntent;

public class LauncherActivity extends AppCompatActivity {

    private static final String DEFAULT_URL = "https://fund-manager-app-2.preview.emergentagent.com";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Uri uri = Uri.parse(DEFAULT_URL);

        try {
            TrustedWebActivityIntentBuilder builder = new TrustedWebActivityIntentBuilder(uri);
            TrustedWebActivityIntent twaIntent = builder.build(
                    new CustomTabsIntent.Builder().build().intent.getExtras() != null
                            ? new CustomTabsIntent.Builder().build().intent.getExtras()
                            : new Bundle()
            );

            // Launch as Trusted Web Activity
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                    .build();
            customTabsIntent.launchUrl(this, uri);
        } catch (Exception e) {
            // Fallback: open in Custom Tab
            CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                    .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                    .build();
            customTabsIntent.launchUrl(this, uri);
        }

        finish();
    }
}
