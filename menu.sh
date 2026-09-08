#!/usr/bin/env bash

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

while true; do
    echo ""
    echo "=== Sneaker Studio — Contract Testing Demo ==="
    echo ""
    echo "Consumer"
    echo "  1) Install consumer dependencies"
    echo "  2) Run consumer Pact tests  (generates pact file)"
    echo "  3) Show generated pact file"
    echo ""
    echo "Provider"
    echo "  4) Install provider dependencies"
    echo "  5) Start provider server on port 3002"
    echo "  6) Verify pacts from PactFlow  (requires PACT_BROKER_BASE_URL + PACT_BROKER_TOKEN)"
    echo ""
    echo "  q) Quit"
    echo ""
    read -rp "Choose an option: " choice

    case "$choice" in
        1)
            echo ""
            echo "--- Installing consumer dependencies ---"
            (cd "$BASE/consumers/sneaker-studio-web" && npm install)
            ;;
        2)
            echo ""
            echo "--- Running consumer Pact tests ---"
            (cd "$BASE/consumers/sneaker-studio-web" && npm test)
            ;;
        3)
            echo ""
            pact_file="$BASE/consumers/sneaker-studio-web/pacts/sneaker-studio-web-warehouse-inventory-api.json"
            if [ -f "$pact_file" ]; then
                cat "$pact_file" | python3 -m json.tool 2>/dev/null || cat "$pact_file"
            else
                echo "No pact file found. Run option 2 first."
            fi
            ;;
        4)
            echo ""
            echo "--- Installing provider dependencies ---"
            (cd "$BASE/services/warehouse-inventory-api" && npm install)
            ;;
        5)
            echo ""
            echo "--- Starting provider server (Ctrl+C to stop) ---"
            (cd "$BASE/services/warehouse-inventory-api" && npm start)
            ;;
        6)
            echo ""
            if [ -z "$PACT_BROKER_BASE_URL" ] || [ -z "$PACT_BROKER_TOKEN" ]; then
                echo "Set PACT_BROKER_BASE_URL and PACT_BROKER_TOKEN before running verification."
            else
                echo "--- Verifying pacts from PactFlow ---"
                (cd "$BASE/services/warehouse-inventory-api" && npm test)
            fi
            ;;
        q|Q)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid option."
            ;;
    esac
done
