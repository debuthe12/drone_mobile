# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# FFmpeg-kit ProGuard Rules
-keep class com.arthenica.ffmpegkit.** { *; }
-keep class com.arthenica.smartexception.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes in FFmpeg Kit
-keep class com.arthenica.ffmpegkit.FFmpegKitConfig { *; }
-keep class com.arthenica.ffmpegkit.FFmpegKit { *; }
-keep class com.arthenica.ffmpegkit.FFprobeKit { *; }
-keep class com.arthenica.ffmpegkit.Session { *; }
-keep class com.arthenica.ffmpegkit.Statistics { *; }