# Credit Card Fraud Detection Project

This project focuses on detecting fraudulent credit card transactions using machine learning and full-stack technologies.

## Architecture

- Frontend (`client/`): React dashboard for transaction input, risk scoring view, and recent alerts.
- Backend (`server/`): Node.js + Express API that stores transactions and calls the ML service.
- Machine Learning (`ml-model/`): Python Flask service with a logistic regression model for fraud probability.
- Database: MongoDB for storing transaction history and analysis feed.
- Containerization: Docker + Docker Compose for one-command startup.

## Key Features

- Real-time fraud detection
- User transaction monitoring
- Risk scoring (Low / Medium / High)
- Admin dashboard for fraud analysis
- Alerts for suspicious activity

## Technologies Used

- Frontend: React.js
- Backend: Node.js + Express
- Database: MongoDB
- Machine Learning: Python (Logistic Regression, Neural Networks, Decision Trees)
- Containerization: Docker

## Approach

The system analyzes user spending behavior and identifies anomalies using:

- Pattern recognition
- Outlier detection
- Behavioral analysis

## Goal

To build an efficient and scalable system that minimizes financial fraud and improves transaction security.

## Project Structure

```text
Fraud-Detection-/
	client/         React UI (Vite)
	server/         Express API + MongoDB integration
	ml-model/       Flask ML prediction service
	docker-compose.yml
```

## Run With Docker

```bash
docker-compose up --build
```

After startup:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api/health`
- ML Service: `http://localhost:8000/health`

## Local Development (Without Docker)

### 1. ML Service

```bash
cd ml-model
pip install -r requirements.txt
python app.py
```

### 2. Backend Service

```bash
cd server
npm install
npm start
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Note: Local development expects a running MongoDB instance at `mongodb://localhost:27017/fraud_detection`.

## API Endpoints

- `GET /api/health` : backend and ML health status
- `POST /api/predict` : score a transaction and save it
- `GET /api/transactions?limit=10` : fetch recent scored transactions

---

Future Improvements:

- Real-time notification system (SMS/Email)
- Advanced AI models for better accuracy
- Integration with banking APIs
