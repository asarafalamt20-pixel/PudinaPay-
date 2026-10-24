# Android WebView wrapper

This is a minimal Android Studio wrapper that opens the hosted Pudina Pay demo site.

1. Create/open an Android Studio project with package `com.pudinapay.demo`.
2. Copy `MainActivity.kt` into `app/src/main/java/com/pudinapay/demo/`.
3. Merge `AndroidManifest.xml` into `app/src/main/AndroidManifest.xml`.
4. Set `APP_URL` in `MainActivity.kt` to your deployed HTTPS URL.
5. Use a current Android Gradle Plugin / Kotlin setup, then build an APK in Android Studio.

This wrapper requires a deployed backend because API calls go to the hosted web app. It does not provide real payments. Do not publish it as a real UPI/banking app.
