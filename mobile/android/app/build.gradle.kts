import java.util.Base64

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// FCM config plugin — applied only when google-services.json exists so the
// project still builds before the Firebase project is wired up.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

fun flutterDartDefines(): Map<String, String> {
    val encodedDefines = (project.findProperty("dart-defines") as? String).orEmpty()
    if (encodedDefines.isBlank()) return emptyMap()

    return encodedDefines
        .split(",")
        .mapNotNull { encoded ->
            val decoded = runCatching {
                String(Base64.getDecoder().decode(encoded), Charsets.UTF_8)
            }.getOrNull() ?: return@mapNotNull null
            val parts = decoded.split("=", limit = 2)
            if (parts.size == 2) parts[0] to parts[1] else null
        }
        .toMap()
}

val validateReleaseDartDefines by tasks.registering {
    doLast {
        val defines = flutterDartDefines()
        val missing = listOf("SUPABASE_URL", "SUPABASE_ANON_KEY")
            .filter { defines[it].isNullOrBlank() }

        if (missing.isNotEmpty()) {
            throw GradleException(
                "Release APK is missing required Dart defines: ${missing.joinToString(", ")}. " +
                    "Build with: flutter build apk --release --dart-define-from-file=env.release.json"
            )
        }
    }
}

android {
    namespace = "com.arise.os"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // flutter_local_notifications uses java.time — needs desugaring.
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        applicationId = "com.arise.os"
        // Exact alarms + full-screen intent + FGS types need modern APIs;
        // minSdk 26 gives native notification channels.
        minSdk = 26
        targetSdk = 35
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // WorkManager/Room uses generated classes via reflection during
            // AndroidX Startup. R8 was stripping the release constructor and
            // crashing before Flutter rendered the first frame.
            isMinifyEnabled = false
            isShrinkResources = false
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

tasks.matching { it.name == "preReleaseBuild" }.configureEach {
    dependsOn(validateReleaseDartDefines)
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

dependencies {
    // WorkManager for the periodic alarm-reschedule safety pass.
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    // NotificationCompat & co (Flutter embeds an older core; be explicit).
    implementation("androidx.core:core-ktx:1.15.0")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
