📱 FlowNest

FlowNest is a native Android mobile application built using React Native CLI.
The application runs on an Android Emulator or a physical Android device.

🚀 Tech Stack

React Native (CLI)

Java JDK 17

Android SDK

Node.js

Gradle

📦 Prerequisites

Ensure the following are installed:

Node.js (v20+ recommended)

npm (v10+)

Java JDK 17

Android Studio (for SDK & Emulator)

Android Emulator or Physical Device

ADB configured in system PATH

Verify setup:

node -v
npm -v
java -version
adb devices
🛠 Installation

Clone the repository:

git clone <your-repository-url>
cd FlowNest

Install dependencies:

npm install
▶️ Running the Application (Android)
Step 1 – Start Metro Bundler
npx react-native start

Metro runs on port 8081 by default.

Step 2 – Build & Run on Android

Open a new terminal window and run:

npx react-native run-android

If multiple devices are connected:

npx react-native run-android --device emulator-5554
🔄 Fast Refresh

Changes reflect instantly when files are saved.

Manual reload:

Press R twice in Emulator

Or Ctrl + M → Reload

🧹 Clean Build (If Build Fails)
cd android
gradlew clean
cd ..
npx react-native run-android
⚙️ Android SDK Configuration (If Needed)

If you encounter SDK location errors, ensure:

android/local.properties contains:

sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
📁 Project Structure
FlowNest/
│
├── android/        # Native Android code
├── ios/            # iOS code (if applicable)
├── App.tsx         # Main entry component
├── package.json    # Dependencies & scripts
└── node_modules/   # Installed packages
📦 Generate Release APK
cd android
gradlew assembleRelease

APK output path:

android/app/build/outputs/apk/release/
📌 Important Notes

This is a native Android mobile application.

It does not run in a web browser.

Android Emulator or physical device is required.

Native modules require proper Android SDK setup.

📄 License

This project is private and proprietary.
