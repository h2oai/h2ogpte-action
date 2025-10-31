#!/bin/sh
# shellcheck shell=dash
# shellcheck disable=SC2039  # local is non-POSIX
#
# Copyright 2025 H2O.ai, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This runs on Unix shells like bash/dash/ksh/zsh. It uses the common `local`
# extension. Note: Most shells limit `local` to 1 var per line, contra bash.

# Some versions of ksh have no `local` keyword. Alias it to `typeset`, but
# beware this makes variables global with f()-style function syntax in ksh93.
# mksh has this alias by default.
has_local() {
    # shellcheck disable=SC2034  # deliberately unused
    local _has_local
}

has_local 2>/dev/null || alias local=typeset

set -e
set -u

# h2oGPTe Action Setup Script
# This script helps you set up the h2oGPTe GitHub Action in your repository

# Colors for output
LIGHT_GREY='[0;90m'
MARIGOLD_NC='[0m' # No Color

# Function to get repository name (display only)
get_repo_name_display() {
    git config --get remote.origin.url 2>/dev/null | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' 2>/dev/null || echo 'Unknown'
}

# Function to get repository name (with input)
get_repo_name() {
    local repo_name
    repo_name=$(get_repo_name_display)
    if [ "$repo_name" = "Unknown" ]; then
        printf "Enter repository name (e.g., username/repository): "
        read -r repo_name
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
            echo "$origin_url" | sed 's|\(https*://[^/]*\)/.*|\1|'
        fi
    fi
}

# Function to get repository server URL (with input)
get_repo_server_url() {
    local origin_url=$(get_repo_server_url_display)
    if [ "$origin_url" = "Unknown" ]; then
        printf "Enter repository server URL (e.g., https://github.com): "
        read -r origin_url
    fi
    echo "$origin_url"
}

# Function to get API URL (display only)
get_api_url_display() {
    # Auto-calculate from detected server URL
    local server_url=$(get_repo_server_url_display)
    if [ "$server_url" = "Unknown" ]; then
        echo 'Unknown'
    elif [ "$server_url" = "https://github.com" ]; then
        echo "https://api.github.com"
    else
        echo "${server_url}/api/v3"  # default endpoint for GitHub Enterprise Server
    fi
}

# Function to get API URL (with input)
get_api_url() {
    local api_url
    api_url=$(get_api_url_display)
    if [ "$api_url" = "Unknown" ]; then
        printf "Enter repository API URL (e.g., https://api.github.com): "
        read -r api_url
    fi
    echo "$api_url"
}

# Function to get current branch
get_current_branch() {
    git branch --show-current 2>/dev/null || echo 'Unknown'
}

# Function to print colored output

print_success() {
    printf "✅ %s\n" "$1"
}

print_warning() {
    printf "⚠️ %s\n" "$1"
}

print_error() {
    printf "❌ %s\n" "$1"
}

# Function to check if we're in a git repository
check_git_repo() {
    if [ ! -d ".git" ]; then
        print_error "Not in a git repository. Please run this script from your repository root."
        exit 1
    fi
    print_success "Git repository detected"
}

# Function to detect repository name and handle user confirmation
detect_repo_name() {
    if command -v git >/dev/null 2>&1; then
        REPO_NAME=$(git config --get remote.origin.url 2>/dev/null | sed 's/.*github\.com[:/]\([^/]*\/[^/]*\)\.git.*/\1/' 2>/dev/null || echo "")
    fi

    if [ -z "$REPO_NAME" ]; then
        print_warning "Could not automatically detect repository name"
        printf "Please enter your repository name (e.g., username/repository): "
        read -r REPO_NAME
        # If we couldn't detect, ask for all 3 fields
        printf "Please enter your repository server URL (e.g., https://github.com): "
        read -r REPO_SERVER_URL
        printf "Please enter your repository API URL (e.g., https://api.github.com): "
        read -r REPO_API_URL
    else
        printf "🔍 Detected repository: %s\n" "$REPO_NAME"
        echo
        printf "Is this correct? (y/N): "
        read -r confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            # User confirmed, keep auto-detected values for all 3 fields
            REPO_SERVER_URL=$(get_repo_server_url_display)
            REPO_API_URL=$(get_api_url_display)
            print_success "Using auto-detected values for all repository information"
        else
            # User said no, ask for all 3 fields manually
            printf "Please enter your repository name (e.g., username/repository): "
            read -r REPO_NAME
            printf "Please enter your repository server URL (e.g., https://github.com): "
            read -r REPO_SERVER_URL
            printf "Please enter your repository API URL (e.g., https://api.github.com): "
            read -r REPO_API_URL
        fi
    fi
    echo
}

# Function to get installation location
get_installation_location() {
    DEFAULT_LOCATION=".github/workflows"
    printf "📁 Default installation location: %s\n" "$DEFAULT_LOCATION"
    printf "Enter installation directory - relative path (press Enter for default): "
    read -r INSTALL_DIR

    if [ -z "$INSTALL_DIR" ]; then
        INSTALL_DIR="$DEFAULT_LOCATION"
    fi

    print_success "Installation directory: $INSTALL_DIR"
    echo
}

# Function to create directory
create_directory() {
    printf "📂 Creating directory: %s\n" "$INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    print_success "Directory created successfully"
}

# Function to check if h2ogpte.yaml already exists
check_file_exists() {
    if [ -f "$INSTALL_DIR/h2ogpte.yaml" ]; then
        return 0  # File exists
    else
        return 1  # File doesn't exist
    fi
}

# Function to prompt user for overwrite confirmation
prompt_overwrite() {
    printf "⚠️  h2ogpte.yaml already exists in %s\n" "$INSTALL_DIR"
    printf "Do you want to overwrite it? (y/N): "
    read -r overwrite_choice

    case "$overwrite_choice" in
        y|Y|yes|YES)
            return 0  # User wants to overwrite
            ;;
        *)
            return 1  # User doesn't want to overwrite
            ;;
    esac
}

# Function to show API key instructions and exit
show_api_key_and_exit() {
    show_api_key_instructions
    show_api_base_instructions
    printf "🎉 Setup complete! Your existing h2ogpte.yaml file is ready to use.\n"
    echo
    exit 0
}

# Function to download example file
download_example_file() {
    # Check if file already exists
    if check_file_exists; then
        if ! prompt_overwrite; then
            show_api_key_and_exit
        fi
        printf "🔄 Overwriting existing h2ogpte.yaml...\n"
    else
        printf "⬇️ Downloading h2ogpte.yaml workflow file...\n"
    fi

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

    # Check if sed command was successful
    if ! sed -i.bak \
        -e "s|github_api_url: https://api.github.com|github_api_url: $REPO_API_URL|g" \
        -e "s|github_server_url: https://github.com|github_server_url: $REPO_SERVER_URL|g" \
        "$INSTALL_DIR/h2ogpte.yaml"; then
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
    printf "Which option are you using? (1/2): "
    read -r h2ogpte_choice

    case "$h2ogpte_choice" in
        1)
            H2OGPTE_URL="https://h2ogpte.genai.h2o.ai"
            print_success "Selected freemium option: $H2OGPTE_URL"
            ;;
        2|"")
            printf "Enter your custom h2oGPTe server URL: "
            read -r H2OGPTE_URL
            print_success "Selected custom server: $H2OGPTE_URL"
            ;;
        *)
            print_warning "Invalid choice. Defaulting to custom server."
            printf "Enter your custom h2oGPTe server URL: "
            read -r H2OGPTE_URL
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
    printf "==================== 🔑 Enter h2oGPTe API key ====================\n\n"
    if [ -n "${H2OGPTE_URL:-}" ]; then
        echo "  1. Get your h2oGPTe API key from: $H2OGPTE_URL/api"
    else
        echo "  1. Get your h2oGPTe API key from your h2oGPTe server's /api endpoint"
    fi
    echo "  2. Go to: $REPO_SERVER_URL/$REPO_NAME/settings/secrets/actions/new"
    echo "  3. Name: H2OGPTE_API_KEY"
    echo "  4. Value: [Your h2oGPTe API key]"
    echo "  5. Click 'Add secret'"
    echo
    printf "Press Enter once you've added the H2OGPTE_API_KEY secret... "
    read -r

    printf "${MARIGOLD_YELLOW}Important:${NC} The workflow will not work without this API key!\n"
    echo
}

# Function to show API base instructions
show_api_base_instructions() {
    echo
    printf "==================== 🌐 Enter h2oGPTe API base ====================\n\n"
    if [ -n "${H2OGPTE_URL:-}" ]; then
        echo "  1. Your h2oGPTe API base URL is: $H2OGPTE_URL"
    else
        echo "  1. Get your h2oGPTe API base URL from your h2oGPTe server"
    fi
    echo "  2. Go to: $REPO_SERVER_URL/$REPO_NAME/settings/secrets/actions/new"
    echo "  3. Name: H2OGPTE_API_BASE"
    echo "  4. Value: $H2OGPTE_URL"
    echo "  5. Click 'Add secret'"
    echo
    printf "Press Enter once you've added the H2OGPTE_API_BASE secret... "
    read -r

    printf "${MARIGOLD_YELLOW}

# Commit your changes
echo
printf "======================= 📤 Commit Changes =========================\n\n"
echo "  1. Add your changes to git"
echo "  2. Commit with a descriptive message"
echo "  3. Push to your repository"
echo
printf "Example commands:\n"
echo "  git add ."
echo "  git commit -m \"Add h2oGPTe GitHub Action\""
echo "  git push origin"
echo
printf "Press Enter to continue... "
read -r
echoImportant:${NC} The workflow will not work without this API base URL!\n"
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

    # Step 11: Show API base instructions
    show_api_base_instructions

    echo
    printf "🎉 Setup complete! Your h2oGPTe Action is ready to use.\n"
    echo

    exit 0
}

# Run main function
main
