# Aura

Aura is a mobile habit and productivity tracking application designed to help users structure their daily routines, schedule time-bound tasks, and receive automatic advance reminders.

---

## Interface Overview

| Today's Agenda | Task Scheduling |
| :---: | :---: |
| <img src="assets/screenshots/today.png" width="300" alt="Today's Agenda Screen" /> | <img src="assets/screenshots/schedule.png" width="300" alt="Task Scheduling Screen" /> |

---

## Core Capabilities

- **User-Defined Task Management:** Create, track, and complete personal tasks and habits without predefined templates.
- **Automated Advance Reminders:** Schedules local notifications 30 minutes before a task's set deadline.
- **Mobile-First Layout:** Structured around bottom tab navigation, dedicated task cards, and straightforward status toggling.
- **Local Persistence:** Data is retained locally on the device using AsyncStorage without external server dependencies.
- **Daily Analytics:** Displays current task distribution between pending and completed states.

---

## Technology Stack

- **Framework:** React Native with Expo
- **Navigation:** React Navigation (Bottom Tabs)
- **Local Storage:** AsyncStorage
- **Notifications:** Expo Notifications
- **Language:** JavaScript / TypeScript

---

## Setup and Execution

### Prerequisites
- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Aditthan-07/Aura.git
   cd Aura
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

- **Mobile (Expo Go):**
  ```bash
  npx expo start
  ```
  Scan the terminal QR code using Expo Go on Android or the native Camera app on iOS.

- **Web Browser:**
  ```bash
  npx expo start --web
  ```

---

## License

This project is licensed under the MIT License.
