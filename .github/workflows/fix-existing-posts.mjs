name: Fix Existing Blog Posts Formatting

on:
  workflow_dispatch: # GitHub Actions 탭에서 버튼을 눌러 언제든 수동 실행 가능

permissions:
  contents: write # 수정된 마크다운 파일을 커밋 및 푸시할 권한

jobs:
  fix-posts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run Fix Existing Posts Script
        run: |
          npm install --legacy-peer-deps
          node fix-existing-posts.mjs

      - name: Commit and Push Fixed Posts
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add src/content/post/
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Fix existing multi-language posts formatting [skip ci]"
            git push
          fi
