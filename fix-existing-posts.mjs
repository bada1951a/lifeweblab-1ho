name: Fix Existing Posts Formatting

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  revert:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Reset Posts to Clean State
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          
          # 글자 잘리기 전(9b0fe34) 원본으로 src/data/post 40개 글 통째로 일괄 복구
          git checkout 9b0fe34 -- src/data/post/
          
          if git diff --staged --quiet; then
            echo "복구할 변경 사항이 없습니다."
          else
            git commit -m "revert: 12개 언어 40개 포스트 전체 원본으로 일괄 복구"
            git push origin main
          fi
