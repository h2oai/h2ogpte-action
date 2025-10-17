#!/bin/sh

# h2oGPTe Action Setup Script
# This script helps you set up the h2oGPTe GitHub Action in your repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
LIGHT_GREY='\033[0;90m'
MARIGOLD_YELLOW='\033[38;2;234;162;33m'
NC='\033[0m' # No Color

# Function to get repository name (display only)
get_repo_name_display() {
    git config --get remote.origin.url 2>/dev/null | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' 2>/dev/null || echo 'Unknown'
}

# Function to get repository name (with input)
get_repo_name() {
    local repo_name=$(get_repo_name_display)
    if [ "$repo_name" = "Unknown" ]; then
        read -p "Enter repository name (e.g., username/repository): " repo_name
    fi
    echo "$repo_name"
}

# Function to get repository server URL (display only)
get_repo_server_url_display() {
    local origin_url=$(git remote get-url origin 2>/dev/null)
    if [ -z "$origin_url" ]; then
        echo 'Unknown'
    else
        # Handle SSH URLs (git@github.com:user/repo.git)
        if echo "$origin_url" | grep -q '^git@'; then
            echo "$origin_url" | sed 's/git@\([^:]*\):.*/\1/' | sed 's/^/https:\/\//'
        else
            # Handle HTTPS URLs (https://github.com/user/repo.git)
            echo "$origin_url" | sed 's/\(https\?:\/\/[^\/]*\).*/\1/'
        fi
    fi
}

# Function to get repository server URL (with input)
get_repo_server_url() {
    local origin_url=$(get_repo_server_url_display)
    if [ "$origin_url" = "Unknown" ]; then
        read -p "Enter repository server URL (e.g., https://github.com): " origin_url
    fi
    echo "$origin_url"
}

# Function to get API URL (display only)
get_api_url_display() {
    local origin_url=$(git remote get-url origin 2>/dev/null)
    if [ -z "$origin_url" ]; then
        echo 'Unknown'
    else
        # Auto-calculate from detected server URL
        local server_url=$(get_repo_server_url_display)
        if [ "$server_url" = "https://github.com" ]; then
            echo "https://api.github.com"
        else
            echo "${server_url}/api/v3"
        fi
    fi
}

# Function to get API URL (with input)
get_api_url() {
    local api_url=$(get_api_url_display)
    if [ "$api_url" = "Unknown" ]; then
        read -p "Enter repository API URL (e.g., https://api.github.com): " api_url
    fi
    echo "$api_url"
}

# Function to get current branch
get_current_branch() {
    git branch --show-current 2>/dev/null || echo 'Unknown'
}

# Function to print colored output

print_success() {
    printf "✅ $1\n"
}

print_warning() {
    printf "⚠️ $1\n"
}

print_error() {
    printf "❌ $1\n"
}

# Function to check if we're in a git repository
check_git_repo() {
    if [ ! -d ".git" ]; then
        print_error "Not in a git repository. Please run this script from your repository root."
        exit 1
    fi
    print_success "Git repository detected ^"
}

# Function to detect repository name and handle user confirmation
detect_repo_name() {
    if command -v git >/dev/null 2>&1; then
        REPO_NAME=$(git config --get remote.origin.url 2>/dev/null | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' 2>/dev/null || echo "")
    fi

    if [ -z "$REPO_NAME" ]; then
        print_warning "Could not automatically detect repository name"
        read -p "Please enter your repository name (e.g., username/repository): " REPO_NAME
        # If we couldn't detect, ask for all 3 fields
        read -p "Please enter your repository server URL (e.g., https://github.com): " REPO_SERVER_URL
        read -p "Please enter your repository API URL (e.g., https://api.github.com): " REPO_API_URL
    else
        printf "🔍 Detected repository: $REPO_NAME\n"
        echo
        read -p "Is this correct? (y/N): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            # User confirmed, keep auto-detected values for all 3 fields
            REPO_SERVER_URL=$(get_repo_server_url_display)
            REPO_API_URL=$(get_api_url_display)
            print_success "Using auto-detected values for all repository information"
        else
            # User said no, ask for all 3 fields manually
            read -p "Please enter your repository name (e.g., username/repository): " REPO_NAME
            read -p "Please enter your repository server URL (e.g., https://github.com): " REPO_SERVER_URL
            read -p "Please enter your repository API URL (e.g., https://api.github.com): " REPO_API_URL
        fi
    fi
    echo
}

# Function to get installation location
get_installation_location() {
    DEFAULT_LOCATION=".github/workflows"
    printf "📁 Default installation location: $DEFAULT_LOCATION\n"
    read -p "Enter installation directory - relative path (press Enter for default): " INSTALL_DIR

    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="$DEFAULT_LOCATION"
    fi

    print_success "Installation directory: $INSTALL_DIR"
    echo
}

# Function to create directory
create_directory() {
    printf "📂 Creating directory: $INSTALL_DIR\n"
    mkdir -p "$INSTALL_DIR"
    print_success "Directory created successfully"
}

# Function to download example file
download_example_file() {
    printf "⬇️ Downloading h2ogpte.yaml workflow file...\n"

    # Base URL for the example file
    BASE_URL="https://raw.githubusercontent.com/h2oai/h2ogpte-action/main/examples"

    if curl -s -o "$INSTALL_DIR/h2ogpte.yaml" "$BASE_URL/h2ogpte.yaml"; then
        print_success "Downloaded h2ogpte.yaml"
    else
        print_error "Failed to download h2ogpte.yaml"
        exit 1
    fi
}

# Function to customize the workflow file with user values
customize_workflow_file() {
    printf "⚙️ Customizing workflow file with your settings...\n"

    # Check if the workflow file exists
    if [ ! -f "$INSTALL_DIR/h2ogpte.yaml" ]; then
        print_error "Workflow file not found: $INSTALL_DIR/h2ogpte.yaml"
        print_error "Please ensure the file was downloaded successfully"
        return 1
    fi

    # Replace the hardcoded values with user-provided values
    sed -i.bak \
        -e "s|h2ogpte_api_base: https://h2ogpte.genai.h2o.ai|h2ogpte_api_base: $H2OGPTE_URL|g" \
        -e "s|github_api_url: https://api.github.com|github_api_url: $REPO_API_URL|g" \
        -e "s|github_server_url: https://github.com|github_server_url: $REPO_SERVER_URL|g" \
        "$INSTALL_DIR/h2ogpte.yaml"

    # Check if sed command was successful
    if [ $? -ne 0 ]; then
        print_error "Failed to customize workflow file"
        return 1
    fi

    # Remove the backup file
    rm -f "$INSTALL_DIR/h2ogpte.yaml.bak"

    print_success "Workflow file customized successfully"
}

# Function to ask about h2oGPTe version
ask_h2ogpte_version() {
    echo
    printf "🔧 h2oGPTe Server Configuration:\n"
    echo "  1. Freemium option (https://h2ogpte.genai.h2o.ai)"
    echo "  2. Custom h2oGPTe server"
    echo
    read -p "Which option are you using? (1/2): " h2ogpte_choice

    case "$h2ogpte_choice" in
        1)
            H2OGPTE_URL="https://h2ogpte.genai.h2o.ai"
            print_success "Selected freemium option: $H2OGPTE_URL"
            ;;
        2|"")
            read -p "Enter your custom h2oGPTe server URL: " H2OGPTE_URL
            print_success "Selected custom server: $H2OGPTE_URL"
            ;;
        *)
            print_warning "Invalid choice. Defaulting to custom server."
            read -p "Enter your custom h2oGPTe server URL: " H2OGPTE_URL
            print_success "Selected custom server: $H2OGPTE_URL"
            ;;
    esac
    echo
}

# Function to show confirmation message
show_confirmation() {
    echo
    print_success "Setup completed successfully!"
    echo
}

# Function to show next steps message
show_next_steps() {
    echo
    printf "======================== 📋 Next Steps =========================\n\n"
    echo "  1. Review the downloaded workflow file"
    echo "  2. Commit and push the changes to your repository"
    echo
}

# Function to show API key instructions
show_api_key_instructions() {
    echo
    printf "==================== 🔑 Get h2oGPTe API key ====================\n\n"
    echo "  1. Get your h2oGPTe API key from: $H2OGPTE_URL/api"
    echo "  2. Go to: $REPO_SERVER_URL/$REPO_NAME/settings/secrets/actions/new"
    echo "  3. Name: H2OGPTE_API_KEY"
    echo "  4. Value: [Your h2oGPTe API key]"
    echo "  5. Click 'Add secret'"
    echo
    printf "${MARIGOLD_YELLOW}Important:${NC} The workflow will not work without this API key!\n"
    echo
}

# Main execution
main() {
    printf "${MARIGOLD_YELLOW}"
    echo "┌──────────────────────────────────────────────────────────────┐"
    printf "│${NC}                    h2oGPTe Action Setup                      ${MARIGOLD_YELLOW}│\n"
    echo "│                                                              │"
    printf "│${LIGHT_GREY}  This script will help you set up the h2oGPTe GitHub Action  ${MARIGOLD_YELLOW}│\n"
    printf "│${LIGHT_GREY}  in your repository.                                         ${MARIGOLD_YELLOW}│\n"
    echo "│                                                              │"
    printf "│${NC}  Repository name: ${MARIGOLD_YELLOW}%-43s│\n" "$(get_repo_name_display)"
    printf "│${NC}  Repository server url: ${MARIGOLD_YELLOW}%-37s│\n" "$(get_repo_server_url_display)"
    printf "│${NC}  Repository api url: ${MARIGOLD_YELLOW}%-40s│\n" "$(get_api_url_display)"
    printf "│${NC}  Current branch: ${MARIGOLD_YELLOW}%-44s│\n" "$(get_current_branch)"
    echo "└──────────────────────────────────────────────────────────────┘"
    printf "${NC}"
    echo

    echo
    printf "======================= 🔧 Setup GitHub ========================\n\n"
    # Step 1: Check if we're in a git repository
    check_git_repo

    # Step 2: Detect repository name and get all repository info
    detect_repo_name

    # Step 3: Get installation location
    get_installation_location

    # Step 4: Create directory
    create_directory

    # Step 5: Download example file
    download_example_file

    echo
    printf "======================= 🔧 Setup h2oGPTe =======================\n\n"
    # Step 6: Ask about h2oGPTe version
    ask_h2ogpte_version

    # Step 7: Customize workflow file
    customize_workflow_file

    # Step 8: Show confirmation message
    show_confirmation

    # Step 9: Show next steps
    show_next_steps

    # Step 10: Show API key instructions
    show_api_key_instructions

    echo
    printf "🎉 Setup complete! Your h2oGPTe Action is ready to use.\n"
    echo
}

# Run main function
main
