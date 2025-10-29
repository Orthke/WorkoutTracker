# Workout Tracker

A React Native (Expo) app to track your workouts.

## Features
- Home screen with welcome message, add workout button, and workout list
- Add Workout screen for entering workout details
- Local storage using AsyncStorage
- Basic navigation with React Navigation

## Folder Structure
- `components/` — Reusable UI components
- `screens/` — App screens (Home, Add Workout, etc.)
- `utils/` — Utility functions (e.g., storage helpers)

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`

### Running the App

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the Expo development server:
   ```sh
   npm start
   ```
3. To run on Android:
   - Use an emulator or the Expo Go app on your device.
   - Press `a` in the terminal to open Android emulator.
4. To run on iOS (Mac only):
   - Use an iOS simulator or the Expo Go app on your device.
   - Press `i` in the terminal to open iOS simulator.

### Main Screen Code
- The main screen is in `screens/HomeScreen.js`.

---

This project will be expanded to include editing, statistics, and export features.

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
