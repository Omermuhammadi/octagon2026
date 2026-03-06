# Octagon Oracle - PRD for Modules 1-8

Date: 2026-02-08
Owner: Product
Doc status: Draft for implementation planning

## 1. Summary
This PRD defines the next set of features for Octagon Oracle across eight modules: Account Management, Win and Technique Prediction, Fighter Comparison and Strategy Suggestions, Beginner Training Roadmaps, Gym Finder and Self-Defense Guide, Form Correction, Gear Store, and Chatbot (NLP Assistant). The goal is to move from mostly static or demo experiences to fully functional, data-backed, and user-personalized features.

## 2. Current State (from codebase)
- Account: Login, register, forgot/reset password, profile edit (role=coach/fan), basic stats stored in user model.
- Predictions: Prediction page is static (no backend inference or model).
- Comparison: Fighter search and compare endpoints exist; frontend shows radar chart and simple suggestions.
- Training: Roadmaps exist but are discipline-based (BJJ, Wrestling, MMA) and stored in localStorage only; no age-based paths.
- Gym Finder: Static Pakistan gym list with filters; no real map or geolocation.
- Self-Defense: Static scenarios and a simple in-page chatbot.
- Form Correction: Static analysis results; no ML or real video processing.
- Gear Store: Not implemented.
- Chatbot: Static canned responses, no NLP or knowledge base.

## 3. Goals
- Deliver real, data-backed predictions (winner, probability, round, method).
- Provide actionable, personalized training and strategy recommendations.
- Make roadmaps, gym finder, and self-defense content more practical and personalized.
- Add a usable form-correction feature with real inference.
- Introduce a gear store and chatbot that can guide users to content and answers.
- Persist user preferences, stats, and progress in the backend.

## 4. Non-Goals
- Full social network features (comments, follows, DMs).
- Live streaming or paid coaching marketplace (not in this phase).
- Native mobile app (web only).

## 5. Personas
- Beginner: new to MMA, wants simple guided roadmap and safety.
- Fighter: active competitor, wants predictions, comparison, form feedback.
- Coach: wants strategy suggestions and training plans.
- Fan: wants predictions and fighter comparisons.

## 6. Functional Requirements (by Module)

### 6.1 Module 1: Account Management
User Stories
- As a user, I can sign up and log in securely.
- As a user, I can select my profile type: fighter, beginner, or coach.
- As a user, I can save preferences, tracked stats, and roadmap progress.

Requirements
- Add user roles: fighter, beginner, coach (keep fan if needed for compatibility).
- Profile fields: age group, location (city), training goals, preferred disciplines.
- Persist roadmap progress and training session logs in backend.
- Track and update stats (predictions made, accuracy rate, training sessions).
- Allow profile switching and basic preferences management.

Acceptance Criteria
- User can register and select a profile type.
- Profile changes persist across sessions and devices.
- Roadmap progress persists in DB and is consistent with UI.

### 6.2 Module 2: Win and Technique Prediction
User Stories
- As a user, I can select two fighters and get a win probability.
- As a user, I can see predicted round and method (KO/TKO, submission, decision).

Requirements
- Prediction API endpoint: input fighters (IDs or names), output probabilities and method.
- Model should use existing fight stats data and events data as features.
- Provide confidence score and top 3 factors for prediction.
- Store prediction requests and user history.

Acceptance Criteria
- API returns winner probability for each fighter.
- API returns predicted round and method with confidence.
- Prediction page consumes real API and displays results.

### 6.3 Module 3: Fighter Comparison and Strategy Suggestion
User Stories
- As a user, I can compare two fighters and see key differences.
- As a fighter/coach, I can receive strategy suggestions to counter an opponent.

Requirements
- Extend comparison API to include derived insights (strengths/weaknesses).
- Add strategy suggestion engine based on matchup and user profile.
- Provide recommended skills and drills, linking to training roadmaps.

Acceptance Criteria
- Comparison page highlights at least 3 key differences and 3 counter-suggestions.
- Suggestions update based on selected fighters and user role.

### 6.4 Module 4: Beginner Training Roadmaps
User Stories
- As a beginner, I can pick an age-based roadmap.
- As a user, I can follow tasks with videos and safety routines.

Requirements
- Add age groups: under 15, 15-25, 25+.
- Provide beginner-first discipline guidance (wrestling/BJJ basics).
- Store progress in backend (tasks completed, weeks completed).
- Add safety routines and short video or link tasks.

Acceptance Criteria
- User can select an age group and see a tailored roadmap.
- Progress is saved and restored on reload and across devices.

### 6.5 Module 5: Gym Finder and Self-Defense Guide
User Stories
- As a user, I can find gyms near my location.
- As a user, I can read a self-defense guide, including women-focused tips.

Requirements
- Add map integration (Google Maps or similar).
- Use browser geolocation to find nearby gyms.
- Store gyms in database; allow filters by discipline and pricing.
- Expand self-defense guide with women-focused tracks and safety routines.

Acceptance Criteria
- User can search gyms by location and see map markers.
- Self-defense guide includes a dedicated women-focused section and tips.

### 6.6 Module 6: Form Correction
User Stories
- As a user, I can upload a video or use webcam to check form.
- As a user, I receive a simple Good/Needs Improvement result.

Requirements
- Integrate pose estimation (client or server) for basic strike analysis.
- Provide feedback: stance, guard, hip rotation, extension.
- Store form sessions and basic scores.
- Clarify or remove unrelated requirement: "trending topics and breaking news".

Acceptance Criteria
- User can upload or record a clip and receive a score and feedback.
- Output includes a simple Good/Needs Improvement result.

### 6.7 Module 7: Gear Store
User Stories
- As a user, I can browse training equipment and buy gear.

Requirements
- Product catalog with categories, price, inventory.
- Product detail page and cart.
- Payment flow (Stripe) or affiliate link checkout (phase 1).
- Order history in profile.

Acceptance Criteria
- User can add products to cart and complete checkout (or be redirected).

### 6.8 Module 8: Chatbot (NLP Assistant)
User Stories
- As a user, I can ask questions and get relevant answers.
- As a user, I can be guided to roadmaps, gyms, or gear.

Requirements
- NLP/LLM backend with MMA knowledge base.
- Retrieval from internal content: roadmaps, gyms, self-defense, fighters.
- Guardrails and safety responses.
- Logging of interactions for quality monitoring.

Acceptance Criteria
- Chatbot answers common MMA questions and routes users to features.
- Chatbot can cite internal resources and show links to pages.

## 7. Data Model Changes (MongoDB)
- User: add role (fighter/beginner/coach), ageGroup, location, preferences.
- RoadmapProgress: userId, roadmapId, completedTasks, currentWeek, updatedAt.
- Prediction: userId, fighter1Id, fighter2Id, result, confidence, createdAt.
- FormSession: userId, technique, score, feedback, createdAt.
- Gym: name, city, address, disciplines, geo coordinates, pricing, rating.
- Product: name, category, price, images, stock, description.
- Order: userId, items, total, status, createdAt.
- ChatLog: userId, messages, intent, resolved, createdAt.

## 8. API Endpoints (Proposed)
- POST /api/predictions (input fighters, output prediction)
- GET /api/predictions/history (user history)
- GET /api/roadmaps (list)
- POST /api/roadmaps/progress (save progress)
- GET /api/gyms (filters + geo)
- GET /api/gyms/nearby (lat/lng radius)
- POST /api/form-check (upload or analyze)
- GET /api/gear (catalog)
- POST /api/gear/checkout (order or redirect)
- POST /api/chat (message -> response)

## 9. UX Notes
- Update existing pages: prediction, comparison, training, gyms, self-defense, form-check.
- Add new pages: gear store (list, detail, cart, checkout), chatbot help or FAQ.
- Keep role-based navigation (fan/beginner/fighter/coach).
- Provide clear loading and error states for API-backed features.

## 10. Analytics and KPIs
- Activation: % users completing profile and first roadmap task.
- Engagement: weekly active users, roadmap completion rate.
- Prediction accuracy: model accuracy, calibration score.
- Conversion: gear store add-to-cart and checkout rate.
- Retention: 7-day and 30-day retention.

## 11. Security and Privacy
- Protect user data with JWT and role-based access.
- Store videos securely, with retention policy (default 30 days).
- Rate limit prediction and chat endpoints.
- No training on user videos without explicit consent.

## 12. Rollout Plan (Suggested)
Phase 1: Backend persistence for roadmap progress, prediction API scaffold, gym DB.
Phase 2: ML model for prediction, form correction MVP, chatbot MVP.
Phase 3: Gear store checkout and recommendation engine.

## 13. Risks and Dependencies
- ML model quality depends on data cleanliness and feature engineering.
- Video analysis may require GPU or optimized client inference.
- Maps API cost and usage limits.
- Payment integration compliance (PCI) if checkout is integrated.

## 14. Open Questions
- Should we keep "fan" role or replace with "beginner" and "fighter"?
- What is the preferred checkout model for the gear store (Stripe vs affiliate)?
- Should form correction run in browser (privacy) or server (accuracy)?
- Clarify the requirement: "trending topics and breaking news".



you will train the modelfor ai prediction on the existing fight stats data and events data as features. The model should be able to predict the winner, probability, round, and method of victory for a given matchup. The prediction API should return these predictions along with a confidence score and the top 3 factors that influenced the prediction.  i will give you the data and you can start training the model.the data is in the form of scv files in the curent directory 





the form precorrection feature should allow users to upload a video   to check their form on basic strikes. The system should provide feedback on stance, guard, hip rotation, and extension, and give a simple Good/Needs Improvement result.  tell me how cani train a model like that we will be using opencv i suppose plan and tell me also the chatbot should be used and woeking across the platform in real time to answer user questions and guide them to relevant content. It should be able to retrieve information from the internal knowledge base, including roadmaps, gyms, self-defense tips, and fighter stats. The chatbot should also have guardrails to prevent inappropriate content and provide safe responses. We can use a combination of an LLM for natural language understanding and a retrieval system for accessing our internal data. We will need to log interactions for quality monitoring and improvement.


the form correction feature can be implemented using a combination of OpenCV for video processing and a machine learning model or deep learning modelfor pose estimation and analysis. Here's a high-level plan to train a model for form correction:
1. Data Collection: Gather a dataset of videos demonstrating proper and improper form for various strikes (e.g., jab, cross, hook, uppercut). Label each video with the corresponding feedback (stance, guard, hip rotation, extension) and an overall score (Good/Needs Improvement).
2. Preprocessing: Use OpenCV to extract frames from the videos and apply pose estimation techniques (e.g., using a pre-trained model like OpenPose or MediaPipe) to identify key body landmarks.
3. Feature Extraction: From the pose estimation output, extract relevant features such as joint angles, limb positions, and movement patterns that are indicative of proper or improper form.
4. Model Training: Train a machine learning model (e.g., a random forest, SVM, or a neural network) using the extracted features and the labeled feedback. The model should learn to classify the form as Good or Needs Improvement based on the input features.
5. Evaluation: Evaluate the model's performance using metrics such as accuracy, precision, recall, and F1-score. Use a separate test set of videos to validate the model's generalization.
6. Integration: Integrate the trained model into the application, allowing users to upload videos for analysis. The system will process the video, extract features using OpenCV, and use the trained model to provide feedback on the user's form.

form correction feauture is ok but i want to make sure that the chatbot is also working across the platform in real time to answer user questions and guide them to relevant content. It should be able to retrieve information from the internal knowledge base, including roadmaps, gyms, self-defense tips, and fighter stats. The chatbot should also have guardrails to prevent inappropriate content and provide safe responses. We can use a combination of an LLM for natural language understanding and a retrieval system for accessing our internal data. We will need to log interactions for quality monitoring and improvement. tell me how can we implement this chatbot and train it on our internal data



should we use llm for the chatbot or should we use a retrieval system for accessing our internal data?For the chatbot, we can use a combination of both an LLM (Large Language Model) and a retrieval system. The LLM can handle natural language understanding and generate responses, while the retrieval system can access our internal knowledge base to provide accurate and relevant information. Here's how we can implement and train the chatbot:
1. Knowledge Base Creation: Compile and structure our internal data (roadmaps, gyms, self-defense tips, fighter stats) into a format that can be easily queried by the retrieval system. This may involve creating a database or using a vector store for efficient retrieval.
2. LLM Selection: Choose a suitable LLM (e.g., GPT-4, Claude, Gemini) that can be fine-tuned or prompted effectively for our use case. The LLM will be responsible for understanding user queries and generating responses.
3. Retrieval System: Implement a retrieval system that can query the knowledge base based on the user's input. This could be a simple keyword-based search or a more advanced vector-based retrieval system that uses embeddings to find relevant information.
4. Integration: Integrate the LLM and retrieval system so that when a user asks a question, the LLM processes the query, determines if it requires information from the knowledge base, and then calls the retrieval system to fetch the relevant data. The LLM can then use this data to generate a comprehensive response.
5. Guardrails: Implement guardrails to filter out inappropriate content and ensure that the chatbot provides safe and respectful responses. This can be done through a combination of content moderation tools and fine-tuning the LLM with examples of appropriate and inappropriate responses.
6. Logging and Monitoring: Log all interactions with the chatbot for quality monitoring and improvement. Analyze the logs to identify common queries, areas where the chatbot may be providing incorrect or unhelpful responses, and opportunities for further training or fine-tuning the model.
7. Continuous Improvement: Regularly update the knowledge base with new information and retrain or fine-tune the LLM as needed based on user interactions and feedback to improve the chatbot's performance over time.



recompile whole application and test everything , the form corretion module should do everything but model trainig i wil do later and willl integrtae everythig else should work perefcty like a production grade application according to modules the dashboard should show the user profile and stats, the prediction module should call the API and show real predictions, the comparison module should show real comparisons and strategy suggestions, the training module should show real roadmaps and save progress, the gym finder should show real gyms with map integration, the self-defense guide should show real self-defense tips and scenarios, the gear store should show real products and allow checkout, and the chatbot should be able to answer questions and guide users to content. Make sure to test all features thoroughly and fix any bugs or issues that arise during testing.  the dashboards stats shuld be persistentr and real accuracy rate etc should be calculated based on user interactions and stored in the backend. The prediction module should call the real prediction API and display the results accurately. The comparison module should fetch real data for the selected fighters and provide meaningful insights and strategy suggestions. The training module should load real roadmaps from the backend and allow users to track their progress effectively. The gym finder should integrate with a real map service and display actual gyms based on user location. The self-defense guide should provide practical tips and scenarios that are relevant to users. The gear store should have a functional product catalog and a working checkout process. Finally, the chatbot should be responsive, provide accurate information, and guide users to relevant content across the platform. The dashboard should also display the user's profile information and stats, which should be updated in real-time based on their interactions with the platform. Make sure to implement proper error handling and user feedback mechanisms throughout the application to ensure a smooth user experience.