
# Trello copy

## Setup

```sh
#Carlos Jimenez 30920188
# Install dependencies
npm install

#Las rutas es ":cardId , :boardId , listId", donde es un parámetro que representa el ID de su respectivo nombre.

# Run database
docker compose up -d

# Create .env file and fill with the values
cp .env.example .env

# Start in development mode
npm run start:dev

# Or, prepare for run the dist version.

# Run typescript
npm run build

# Run service
npm start
```
