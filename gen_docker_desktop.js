const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, LevelFormat, ShadingType, Table, TableRow, TableCell, WidthType, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Consolas", size: 18, color: "1F2937" })]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, children: [new TextRun({ text, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 }, children: [new TextRun({ text, bold: true })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text, bold: true })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text, size: 22, ...opts })] });
}
function bold(label, value) {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [
    new TextRun({ text: label, bold: true, size: 22 }),
    new TextRun({ text: value, size: 22 })
  ]});
}
function note(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [
      new TextRun({ text: "\u26A0\uFE0F ", size: 22 }),
      new TextRun({ text, size: 20, italics: true, color: "92400E" })
    ]
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders, margins: cellMargins,
      width: { size: i === 0 ? 3000 : 6360, type: WidthType.DXA },
      shading: isHeader ? { fill: "3B82F6", type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader, color: isHeader ? "FFFFFF" : "1F2937", font: "Arial", size: 20 })] })]
    }))
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: "1E40AF", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: "1E3A5F", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "374151", font: "Arial" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // ==================== TITLE ====================
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 200 }, children: [
        new TextRun({ text: "TATS Deployment Guide", size: 52, bold: true, color: "1E40AF" })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
        new TextRun({ text: "Docker Desktop Edition", size: 32, color: "3B82F6" })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "Task Assignment & Tracking System", size: 24, color: "6B7280" })
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [
        new TextRun({ text: "Deploy on Windows with Docker Desktop + Docker Compose", size: 20, color: "9CA3AF" })
      ]}),

      // ==================== 1. PREREQUISITES ====================
      h1("1. Prerequisites"),

      h2("1.1 Install Docker Desktop"),
      p("Download and install Docker Desktop for Windows from docker.com"),
      code("https://www.docker.com/products/docker-desktop/"),
      p("After installation:"),
      bold("1) ", "Open Docker Desktop and wait for the engine to start (green whale icon in system tray)"),
      bold("2) ", "Enable WSL 2 backend (Settings > General > Use WSL 2 based engine)"),
      bold("3) ", "Allocate at least 2GB RAM (Settings > Resources > Memory)"),

      h2("1.2 Verify Installation"),
      p("Open PowerShell or Command Prompt:"),
      code("docker --version"),
      code("docker compose version"),
      note("If docker compose shows error, update Docker Desktop to latest version"),

      h2("1.3 Project Structure"),
      p("Clone the project and organize files as follows:"),
      code("C:\\Projects\\tats\\"),
      code("  docker-compose.yml        # Docker Compose configuration"),
      code("  .env                      # Environment variables"),
      code("  backend\\"),
      code("    Dockerfile"),
      code("    package.json"),
      code("    server.js"),
      code("    controllers\\"),
      code("    services\\"),
      code("    database\\"),
      code("  frontend\\"),
      code("    Dockerfile"),
      code("    dist\\                   # npm run build output"),
      code("  nginx\\"),
      code("    nginx.conf"),
      code("  uploads\\                  # Persistent file storage"),
      code("  mysql-data\\               # Persistent DB data"),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 2. ENV ====================
      h1("2. Environment Variables (.env)"),
      p("Create .env file in the project root:"),
      code("# === Database ==="),
      code("DB_HOST=tats-mysql"),
      code("DB_PORT=3306"),
      code("DB_NAME=tats_system"),
      code("DB_USER=tats_user"),
      code("DB_PASSWORD=TatsSecure2025!"),
      code("DB_ROOT_PASSWORD=RootSecure2025!"),
      code(""),
      code("# === Application ==="),
      code("PORT=5000"),
      code("NODE_ENV=production"),
      code("JWT_SECRET=your-super-secret-jwt-key-change-this"),
      code("JWT_EXPIRES_IN=24h"),
      code("BCRYPT_ROUNDS=12"),
      code(""),
      code("# === Upload ==="),
      code("UPLOAD_DIR=uploads"),
      code("MAX_FILE_SIZE=10485760"),
      note("Change JWT_SECRET and passwords before deploying to production!"),

      // ==================== 3. BACKEND DOCKERFILE ====================
      h1("3. Backend Dockerfile"),
      p("Create backend/Dockerfile:"),
      code("FROM node:22-alpine"),
      code(""),
      code("WORKDIR /app"),
      code(""),
      code("# Install dependencies first (cache layer)"),
      code("COPY package*.json ./"),
      code("RUN npm ci --only=production"),
      code(""),
      code("# Copy source code"),
      code("COPY . ."),
      code(""),
      code("# Create uploads directory"),
      code("RUN mkdir -p /app/uploads"),
      code(""),
      code("# Install PM2 for process management"),
      code("RUN npm install -g pm2"),
      code(""),
      code("EXPOSE 5000"),
      code(""),
      code("# Use PM2 runtime for auto-restart"),
      code("CMD [\"pm2-runtime\", \"server.js\"]"),

      // ==================== 4. FRONTEND ====================
      h1("4. Frontend Build"),
      p("Build the React frontend before Docker Compose:"),
      code("cd C:\\Projects\\tats\\frontend"),
      code("npm install"),
      code("npm run build"),
      p("This creates the dist/ folder that Nginx will serve."),
      note("Make sure configApi.js points to the correct API URL for production (e.g., /api instead of http://localhost:5000/api)"),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 5. NGINX ====================
      h1("5. Nginx Configuration"),
      p("Create nginx/nginx.conf:"),
      code("events {"),
      code("    worker_connections 1024;"),
      code("}"),
      code(""),
      code("http {"),
      code("    include /etc/nginx/mime.types;"),
      code("    default_type application/octet-stream;"),
      code(""),
      code("    # Gzip compression"),
      code("    gzip on;"),
      code("    gzip_types text/plain text/css application/json application/javascript;"),
      code(""),
      code("    server {"),
      code("        listen 80;"),
      code("        server_name localhost;"),
      code(""),
      code("        # Frontend (React static files)"),
      code("        location / {"),
      code("            root /usr/share/nginx/html;"),
      code("            try_files $uri $uri/ /index.html;"),
      code("        }"),
      code(""),
      code("        # Backend API proxy"),
      code("        location /api/ {"),
      code("            proxy_pass http://tats-backend:5000;"),
      code("            proxy_http_version 1.1;"),
      code("            proxy_set_header Host $host;"),
      code("            proxy_set_header X-Real-IP $remote_addr;"),
      code("            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;"),
      code("            proxy_set_header X-Forwarded-Proto $scheme;"),
      code("        }"),
      code(""),
      code("        # Health check"),
      code("        location /health {"),
      code("            proxy_pass http://tats-backend:5000;"),
      code("        }"),
      code(""),
      code("        # File upload size limit"),
      code("        client_max_body_size 10M;"),
      code("    }"),
      code("}"),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 6. DOCKER COMPOSE ====================
      h1("6. Docker Compose"),
      p("Create docker-compose.yml in the project root:"),
      code("version: '3.8'"),
      code(""),
      code("services:"),
      code("  # ========== MySQL Database =========="),
      code("  mysql:"),
      code("    image: mysql:8.0"),
      code("    container_name: tats-mysql"),
      code("    restart: always"),
      code("    environment:"),
      code("      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}"),
      code("      MYSQL_DATABASE: ${DB_NAME}"),
      code("      MYSQL_USER: ${DB_USER}"),
      code("      MYSQL_PASSWORD: ${DB_PASSWORD}"),
      code("    volumes:"),
      code("      - ./mysql-data:/var/lib/mysql"),
      code("    ports:"),
      code("      - '3306:3306'"),
      code("    networks:"),
      code("      - tats-network"),
      code("    healthcheck:"),
      code("      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']"),
      code("      interval: 10s"),
      code("      timeout: 5s"),
      code("      retries: 5"),
      code(""),
      code("  # ========== Node.js Backend =========="),
      code("  backend:"),
      code("    build: ./backend"),
      code("    container_name: tats-backend"),
      code("    restart: always"),
      code("    env_file: .env"),
      code("    depends_on:"),
      code("      mysql:"),
      code("        condition: service_healthy"),
      code("    volumes:"),
      code("      - ./uploads:/app/uploads"),
      code("    ports:"),
      code("      - '5000:5000'"),
      code("    networks:"),
      code("      - tats-network"),
      code(""),
      code("  # ========== Nginx Reverse Proxy =========="),
      code("  nginx:"),
      code("    image: nginx:alpine"),
      code("    container_name: tats-nginx"),
      code("    restart: always"),
      code("    ports:"),
      code("      - '80:80'"),
      code("    volumes:"),
      code("      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro"),
      code("      - ./frontend/dist:/usr/share/nginx/html:ro"),
      code("    depends_on:"),
      code("      - backend"),
      code("    networks:"),
      code("      - tats-network"),
      code(""),
      code("networks:"),
      code("  tats-network:"),
      code("    driver: bridge"),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 7. RUN ====================
      h1("7. Start the System"),

      h2("Step 1: Open Docker Desktop"),
      p("Make sure Docker Desktop is running (green whale icon in system tray)."),

      h2("Step 2: Open Terminal"),
      p("Open PowerShell and navigate to the project:"),
      code("cd C:\\Projects\\tats"),

      h2("Step 3: Build & Start"),
      code("docker compose up -d --build"),
      p("This will:"),
      bold("1) ", "Pull MySQL 8.0 and Nginx Alpine images"),
      bold("2) ", "Build the backend image from Dockerfile"),
      bold("3) ", "Start all 3 containers"),
      bold("4) ", "Wait for MySQL health check before starting backend"),

      h2("Step 4: Check Status"),
      code("docker compose ps"),
      p("You should see 3 containers running:"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          tableRow(["Container", "Status"], true),
          tableRow(["tats-mysql", "Running (healthy)"]),
          tableRow(["tats-backend", "Running"]),
          tableRow(["tats-nginx", "Running"]),
        ]
      }),

      h2("Step 5: Verify"),
      code("# Backend health check"),
      code("curl http://localhost:5000/health"),
      code(""),
      code("# Access via Nginx (full system)"),
      code("# Open browser: http://localhost"),
      code("# Login: admin / admin123"),

      h2("Step 6: View in Docker Desktop"),
      p("Open Docker Desktop > Containers tab to see all 3 containers."),
      p("Click on any container to view logs, terminal, or inspect."),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 8. DAILY USAGE ====================
      h1("8. Daily Commands"),
      
      h2("Start / Stop"),
      code("# Start all containers"),
      code("docker compose up -d"),
      code(""),
      code("# Stop all containers"),
      code("docker compose down"),
      code(""),
      code("# Restart backend only"),
      code("docker compose restart backend"),

      h2("View Logs"),
      code("# All logs"),
      code("docker compose logs -f"),
      code(""),
      code("# Backend logs only"),
      code("docker compose logs -f backend"),
      code(""),
      code("# Last 50 lines"),
      code("docker compose logs --tail=50 backend"),

      h2("Rebuild After Code Changes"),
      code("# Backend code changed:"),
      code("docker compose up -d --build backend"),
      code(""),
      code("# Frontend code changed:"),
      code("cd frontend && npm run build && cd .."),
      code("docker compose restart nginx"),

      h2("Database"),
      code("# Enter MySQL shell"),
      code("docker exec -it tats-mysql mysql -u root -p"),
      code(""),
      code("# Backup database"),
      code("docker exec tats-mysql mysqldump -u root -pRootSecure2025! tats_system > backup.sql"),
      code(""),
      code("# Restore database"),
      code("docker exec -i tats-mysql mysql -u root -pRootSecure2025! tats_system < backup.sql"),

      h2("Clean Up"),
      code("# Stop and remove containers (data preserved)"),
      code("docker compose down"),
      code(""),
      code("# Stop and remove EVERYTHING including data (DANGER!)"),
      code("docker compose down -v"),
      code(""),
      code("# Remove unused images"),
      code("docker image prune -f"),

      new Paragraph({ children: [new PageBreak()] }),

      // ==================== 9. TROUBLESHOOTING ====================
      h1("9. Troubleshooting"),
      
      h3("Backend cannot connect to MySQL"),
      p("MySQL takes 10-30 seconds to initialize. The healthcheck in docker-compose.yml ensures backend waits. If it still fails:"),
      code("docker compose logs mysql"),
      code("docker compose restart backend"),

      h3("Port already in use"),
      p("If port 80 or 5000 is taken (e.g., Laragon, XAMPP):"),
      code("# Check what is using the port"),
      code("netstat -ano | findstr :80"),
      code(""),
      code("# Change port in docker-compose.yml"),
      code("ports:"),
      code("  - '8080:80'    # Use 8080 instead"),
      p("Then access http://localhost:8080"),

      h3("Docker Desktop not starting"),
      bold("1) ", "Make sure WSL 2 is installed: wsl --install"),
      bold("2) ", "Enable Hyper-V in Windows Features"),
      bold("3) ", "Restart computer after enabling"),

      h3("File upload not working"),
      p("Check that uploads/ directory exists and has proper permissions:"),
      code("docker exec -it tats-backend ls -la /app/uploads"),

      // ==================== 10. ARCHITECTURE ====================
      h1("10. Architecture Summary"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          tableRow(["Component", "Details"], true),
          tableRow(["Nginx", "Port 80 - Serve React static files + Proxy API to backend"]),
          tableRow(["Node.js + PM2", "Port 5000 - Express API + JWT Auth + File Operations"]),
          tableRow(["MySQL 8.0", "Port 3306 - Data storage"]),
          tableRow(["File Storage", "./uploads/ bind mount - Task attachments, user avatars"]),
          tableRow(["Frontend", "React.js + Vite (pre-built to dist/)"]),
        ]
      }),

      p(""),
      p("Flow: Browser -> Nginx:80 -> (static files OR proxy /api/) -> Backend:5000 -> MySQL:3306", { color: "6B7280", italics: true }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/user-data/outputs/TATS_Deploy_DockerDesktop.docx", buffer);
  console.log("Done");
});
