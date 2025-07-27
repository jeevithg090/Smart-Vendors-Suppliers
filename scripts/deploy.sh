#!/bin/bash

# Smart Street Deployment Script
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="smart-street"
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION is not supported. Please use version $REQUIRED_VERSION or higher."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

run_tests() {
    log_info "Running tests..."
    
    # Run linting
    log_info "Running ESLint..."
    npm run lint
    
    # Run type checking
    log_info "Running TypeScript check..."
    npm run typecheck
    
    # Run unit tests
    log_info "Running unit tests..."
    npm run test
    
    # Run security audit
    log_info "Running security audit..."
    npm run security:audit
    
    log_success "All tests passed"
}

build_application() {
    log_info "Building application..."
    
    # Clean previous builds
    npm run clean
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Build the application
    log_info "Building for $ENVIRONMENT..."
    if [ "$ENVIRONMENT" = "production" ]; then
        NODE_ENV=production npm run build
    else
        NODE_ENV=staging npm run build
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh dist | cut -f1)
    log_info "Build size: $BUILD_SIZE"
    
    log_success "Build completed successfully"
}

run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Start preview server in background
    npm run preview &
    PREVIEW_PID=$!
    
    # Wait for server to start
    log_info "Waiting for preview server to start..."
    sleep 10
    
    # Run E2E tests
    if npm run test:e2e; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        kill $PREVIEW_PID
        exit 1
    fi
    
    # Kill preview server
    kill $PREVIEW_PID
}

deploy_to_vercel() {
    log_info "Deploying to Vercel ($ENVIRONMENT)..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
        DEPLOYMENT_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*')
    else
        vercel --yes
        DEPLOYMENT_URL=$(vercel --yes 2>&1 | grep -o 'https://[^[:space:]]*')
    fi
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        log_error "Failed to get deployment URL"
        exit 1
    fi
    
    log_success "Deployed to: $DEPLOYMENT_URL"
    echo "DEPLOYMENT_URL=$DEPLOYMENT_URL" >> $GITHUB_ENV 2>/dev/null || true
}

health_check() {
    local url=$1
    log_info "Running health check on $url..."
    
    local elapsed=0
    while [ $elapsed -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -f -s "$url" > /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Waiting for deployment to be ready... ($elapsed/$HEALTH_CHECK_TIMEOUT seconds)"
        sleep $HEALTH_CHECK_INTERVAL
        elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
    done
    
    log_error "Health check failed after $HEALTH_CHECK_TIMEOUT seconds"
    return 1
}

run_lighthouse_audit() {
    local url=$1
    log_info "Running Lighthouse audit on $url..."
    
    if command -v lighthouse &> /dev/null; then
        lighthouse "$url" \
            --output=json \
            --output-path=./lighthouse-report.json \
            --chrome-flags="--headless --no-sandbox" \
            --quiet
        
        # Parse results
        PERFORMANCE=$(node -e "console.log(Math.round(require('./lighthouse-report.json').lhr.categories.performance.score * 100))")
        ACCESSIBILITY=$(node -e "console.log(Math.round(require('./lighthouse-report.json').lhr.categories.accessibility.score * 100))")
        
        log_info "Lighthouse scores - Performance: $PERFORMANCE%, Accessibility: $ACCESSIBILITY%"
        
        if [ "$PERFORMANCE" -lt 80 ]; then
            log_warning "Performance score is below 80%"
        fi
        
        if [ "$ACCESSIBILITY" -lt 90 ]; then
            log_warning "Accessibility score is below 90%"
        fi
    else
        log_warning "Lighthouse not installed, skipping audit"
    fi
}

send_notification() {
    local status=$1
    local url=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local message
        if [ "$status" = "success" ]; then
            message="✅ Smart Street successfully deployed to $ENVIRONMENT: $url"
        else
            message="❌ Smart Street deployment to $ENVIRONMENT failed"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
    fi
}

cleanup() {
    log_info "Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

main() {
    log_info "Starting deployment to $ENVIRONMENT..."
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Validate environment
    if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
        log_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
        exit 1
    fi
    
    # Run deployment steps
    check_prerequisites
    run_tests
    build_application
    
    # Run E2E tests only for production
    if [ "$ENVIRONMENT" = "production" ]; then
        run_e2e_tests
    fi
    
    deploy_to_vercel
    
    # Health check and performance audit
    if [ -n "$DEPLOYMENT_URL" ]; then
        if health_check "$DEPLOYMENT_URL"; then
            run_lighthouse_audit "$DEPLOYMENT_URL"
            send_notification "success" "$DEPLOYMENT_URL"
            log_success "Deployment completed successfully!"
            log_info "Application is available at: $DEPLOYMENT_URL"
        else
            send_notification "failure" "$DEPLOYMENT_URL"
            log_error "Deployment failed health check"
            exit 1
        fi
    fi
}

# Run main function
main "$@"