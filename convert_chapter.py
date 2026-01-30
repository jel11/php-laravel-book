#!/usr/bin/env python3
"""
Конвертер ответов Claude в markdown файлы

Использование:
1. Скопируй ответ Claude из чата в текстовый файл (например, chapter-3-2.txt)
2. Запусти: python convert_chapter.py chapter-3-2.txt 3 2
3. Скрипт создаст файл docs/chapters/part-3/chapter-3-2.md
"""

import sys
import re
from pathlib import Path


def clean_markdown(text):
    """Очищает и форматирует markdown текст"""
    
    # Убираем лишние пустые строки (более 2 подряд)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Убираем пробелы в конце строк
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    return text.strip()


def extract_title(text):
    """Извлекает заголовок из текста"""
    # Ищем первый заголовок уровня 1
    match = re.search(r'^#\s+(.+)$', text, re.MULTILINE)
    if match:
        return match.group(1)
    
    # Если нет, ищем заголовок уровня 2
    match = re.search(r'^##\s+(.+)$', text, re.MULTILINE)
    if match:
        return match.group(1)
    
    return "Без названия"


def add_navigation(text, part, chapter):
    """Добавляет навигацию в конец главы"""
    
    # Определяем предыдущую и следующую главы
    prev_link = None
    next_link = None
    
    # Логика навигации (упрощённая)
    if chapter > 1:
        prev_link = f"/chapters/part-{part}/chapter-{part}-{chapter-1}"
    elif part > 0:
        # TODO: найти последнюю главу предыдущей части
        pass
    
    # TODO: найти следующую главу
    
    # Убираем старую навигацию если есть
    text = re.sub(r'\n---\n\n\*\*Следующая глава:.*?\*\*Предыдущая глава:.*?\n', '', text, flags=re.DOTALL)
    text = re.sub(r'\n\*\*Следующая глава:.*', '', text)
    text = re.sub(r'\n\*\*Предыдущая глава:.*', '', text)
    
    # Добавляем новую навигацию
    navigation = "\n\n---\n\n"
    
    if prev_link:
        navigation += f"← [Предыдущая глава]({prev_link})\n\n"
    
    if next_link:
        navigation += f"[Следующая глава]({next_link}) →\n"
    
    return text + navigation


def convert_file(input_file, part, chapter):
    """Конвертирует текстовый файл в markdown"""
    
    # Читаем исходный файл
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"❌ Файл не найден: {input_file}")
        return False
    
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Очищаем текст
    content = clean_markdown(content)
    
    # Извлекаем заголовок
    title = extract_title(content)
    
    # Добавляем навигацию
    content = add_navigation(content, part, chapter)
    
    # Создаём выходной файл
    output_dir = Path(f"docs/chapters/part-{part}")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"chapter-{part}-{chapter}.md"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Создан файл: {output_file}")
    print(f"   Заголовок: {title}")
    
    return True


def batch_convert(input_dir):
    """Конвертирует все .txt файлы из директории"""
    
    input_path = Path(input_dir)
    if not input_path.exists():
        print(f"❌ Директория не найдена: {input_dir}")
        return
    
    txt_files = list(input_path.glob("*.txt"))
    
    if not txt_files:
        print(f"❌ Не найдено .txt файлов в {input_dir}")
        return
    
    print(f"📁 Найдено {len(txt_files)} файлов")
    print()
    
    for txt_file in sorted(txt_files):
        # Пытаемся извлечь номер части и главы из имени файла
        # Например: chapter-3-2.txt или 3-2.txt
        match = re.search(r'(\d+)-(\d+)', txt_file.stem)
        
        if match:
            part = int(match.group(1))
            chapter = int(match.group(2))
            
            print(f"🔄 Конвертирую {txt_file.name} → Часть {part}, Глава {chapter}")
            convert_file(txt_file, part, chapter)
        else:
            print(f"⚠️  Пропускаю {txt_file.name} (не могу определить номер главы)")
    
    print()
    print("✅ Конвертация завершена!")


def show_progress():
    """Показывает прогресс заполнения глав"""
    
    docs_path = Path("docs/chapters")
    
    if not docs_path.exists():
        print("❌ Директория docs/chapters не найдена")
        return
    
    total = 0
    filled = 0
    
    print("\n📊 Прогресс заполнения:\n")
    
    for part_dir in sorted(docs_path.iterdir()):
        if part_dir.is_dir() and part_dir.name.startswith('part-'):
            part_total = 0
            part_filled = 0
            
            for chapter_file in sorted(part_dir.glob("chapter-*.md")):
                part_total += 1
                
                # Проверяем размер файла (минимум 500 байт считаем заполненным)
                if chapter_file.stat().st_size > 500:
                    part_filled += 1
            
            total += part_total
            filled += part_filled
            
            if part_total > 0:
                percentage = (part_filled / part_total * 100)
                bar = "█" * int(percentage / 10) + "░" * (10 - int(percentage / 10))
                
                print(f"{part_dir.name}: {bar} {part_filled}/{part_total} ({percentage:.0f}%)")
    
    if total > 0:
        total_percentage = (filled / total * 100)
        print(f"\n🎯 Общий прогресс: {filled}/{total} глав ({total_percentage:.1f}%)")
    else:
        print("\n⚠️  Главы ещё не созданы")


def main():
    if len(sys.argv) < 2:
        print("📘 Конвертер ответов Claude в markdown файлы")
        print()
        print("Использование:")
        print("  python convert_chapter.py <файл.txt> <часть> <глава>")
        print("  python convert_chapter.py chapter-3-2.txt 3 2")
        print()
        print("  python convert_chapter.py batch <директория>")
        print("  python convert_chapter.py batch ./claude-chapters/")
        print()
        print("  python convert_chapter.py progress")
        print()
        return
    
    command = sys.argv[1]
    
    if command == "progress":
        show_progress()
    
    elif command == "batch":
        if len(sys.argv) < 3:
            print("❌ Укажите директорию с .txt файлами")
            return
        
        batch_convert(sys.argv[2])
    
    else:
        # Одиночная конвертация
        if len(sys.argv) < 4:
            print("❌ Использование: python convert_chapter.py <файл.txt> <часть> <глава>")
            return
        
        input_file = sys.argv[1]
        part = int(sys.argv[2])
        chapter = int(sys.argv[3])
        
        convert_file(input_file, part, chapter)


if __name__ == "__main__":
    main()
