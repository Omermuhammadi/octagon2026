# Octagon Oracle 🥊🔮

**The Ultimate AI-Powered MMA Analytics & Training Platform**

## Overview
Octagon Oracle is a cutting-edge web application designed to revolutionize how fighters train and how fans engage with Mixed Martial Arts. By leveraging advanced analytics and AI concepts, it provides tailored insights for two distinct user personas: **Coaches/Fighters** and **Fans/Learners**.

## 🚀 Key Features

### For Coaches & Fighters 🥋
*   **Advanced Dashboard**: Track training sessions, performance metrics, and upcoming bouts.
*   **Fighter Comparison**: Deep-dive statistical analysis with radar charts comparing striking, grappling, and cardio.
*   **Training Roadmaps**: Structured curriculum from amateur to pro levels.
*   **Gym Finder**: Locate top-rated training facilities with Google Maps integration.

### For Fans & Learners 📺
*   **AI Predictions**: Data-driven fight outcome predictions with confidence scores and key victory factors.
*   **Form Correction**: AI-powered webcam tool to analyze and improve striking technique (Jab, Cross, Hook).
*   **Self-Defense Guide**: Curated resources for personal safety.
*   **Interactive Polls & History**: Track your prediction accuracy against the AI.

## 🛠️ Tech Stack
*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Maps**: [Google Maps API](https://developers.google.com/maps)
*   **State Management**: React Context API (`AuthContext`)

## 🏁 Getting Started

### Prerequisites
*   Node.js 18+ installed
*   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/octagon-oracle.git
    cd octagon-oracle
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env.local` file in the root directory and add your Google Maps API key:
    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
    ```
    *(Note: The current build uses a placeholder in `app/gyms/page.tsx`. For full functionality, replace it with a valid key.)*

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Open your browser**
    Navigate to `http://localhost:3000` to see the app in action.

### 🐳 Running with Docker

You can run the application using the pre-built image from Docker Hub:

1.  **Ensure Docker is running** on your machine.
2.  **Run the container** using Docker Compose:
    ```bash
    docker compose up -d
    ```
    *Note: This will automatically pull the image `hamzaak10/octagon-oracle-frontend:latest`.*

3.  **Access the App**:
    Open `http://localhost:3001` in your browser.



## 📂 Project Structure

```
octagon-oracle/
├── app/                # Next.js App Router pages
│   ├── (auth)/         # Authentication routes (Login/Register)
│   ├── dashboard/      # Role-based dashboards
│   ├── comparison/     # Fighter comparison tool
│   ├── form-check/     # AI camera analysis
│   ├── gyms/           # Map integration
│   ├── prediction/     # Fight predictions
│   └── ...
├── components/         # Reusable UI components
│   ├── ui/             # Basic UI elements (Buttons, Cards, Inputs)
│   ├── charts/         # Data visualization
│   └── ...
├── contexts/           # Global state (AuthContext)
├── lib/                # Utilities and mock data
└── public/             # Static assets (images, logos)
```

## 🔮 Future Roadmap
*   **Backend Integration**: Connect to a robust backend (Node.js/Python) for real-time user data persistence.
*   **Live AI Models**: Integrate TensorFlow.js or PyTorch for real-time video pose estimation and predictive modeling.
*   **Social Features**: Community forums, fight clubs, and leaderboard challenges.
*   **Mobile App**: React Native adaptation for on-the-go training.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.

---
*Built with ❤️ for the MMA Community.*
