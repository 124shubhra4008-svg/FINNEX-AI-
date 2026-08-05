FROM node:20 AS frontend

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
RUN npm run build


FROM python:3.12

WORKDIR /app

COPY backend ./backend

COPY --from=frontend /app/frontend/.next ./frontend/.next
COPY --from=frontend /app/frontend/package.json ./frontend/package.json

RUN pip install -r backend/requirements.txt

EXPOSE 8000

CMD ["sh", "-c", "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"]