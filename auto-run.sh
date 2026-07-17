#!/bin/bash

echo "⏳ Изчакване 2 часа до рестарт на лимита..."
echo "Старт: $(date)"

sleep 7200

echo "🚀 Стартиране на Claude задачата: $(date)"

cd "/Users/kiril/Downloads/ai-tutor-basic-site 4"

claude -p "$(cat auto-task.md)" \
  --allowedTools "Read,Edit,Write,Bash" \
  --output-format text

echo "✅ Задачата завърши: $(date)"
