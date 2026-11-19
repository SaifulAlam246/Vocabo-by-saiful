# Vocabo by Saiful
### Learn Words. Build Fluency.

## 1. Project Overview

Vocabo by Saiful is a personal English vocabulary learning and revision web application designed to help users build vocabulary, improve English fluency, and remember words through structured learning.

The application organizes English vocabulary into Parts and Lessons. Each lesson contains exactly 10 vocabulary words, their meanings, examples, Bangla translations, synonyms, antonyms, a story, a Bangla story summary, and a Story Word Review.

The main goal is to create a complete, organized, and interactive English vocabulary learning system.

**Application Name:** Vocabo by Saiful  
**Tagline:** Learn Words. Build Fluency.  
**Application Type:** Responsive Web Application  
**Primary Language:** English and Bangla  
**Target Platform:** Desktop, Laptop, Android and Mobile Browsers

## 2. Main Learning Structure

The application follows a structured hierarchy:

- One Part contains 5 Lessons.
- One Lesson contains exactly 10 vocabulary words.
- One Part therefore contains 50 vocabulary words.

Example:

Part 1
- Lesson 1.1 → Words 1–10
- Lesson 1.2 → Words 11–20
- Lesson 1.3 → Words 21–30
- Lesson 1.4 → Words 31–40
- Lesson 1.5 → Words 41–50

Part 2
- Lesson 2.1 → Words 51–60
- Lesson 2.2 → Words 61–70
- Lesson 2.3 → Words 71–80
- Lesson 2.4 → Words 81–90
- Lesson 2.5 → Words 91–100

The numbering should continue automatically based on existing saved lessons.

## 3. Vocabulary Data Structure

Each vocabulary entry should contain:

- Word number
- English word
- Word meaning in Bangla
- English example sentence
- Bangla translation of the example
- Synonyms with Bangla meanings
- Antonyms with Bangla meanings

Each lesson also contains:

1. Story
2. Bangla Story Summary
3. Story Word Review

### Story Word Review Format

Every vocabulary review entry must appear as an individual bullet point, not as one long paragraph.

Example:

- **Ability** → *ability to communicate:* যোগাযোগ করার সক্ষমতা।
- **Abandon** → *abandon his plan:* তার পরিকল্পনা ছেড়ে দেওয়া।

## 4. Main Application Features

The application includes the following learning modules:

### Dashboard
- Total vocabulary words
- Total Parts and Lessons
- Learning progress
- Recent learning activity
- Quick access to learning modules

### Parts & Lessons
- Browse vocabulary by Part and Lesson
- Open individual lessons
- View all 10 words and their details
- Edit and manage lessons

### Add New Lesson
- Paste vocabulary notes in Markdown format.
- Automatically identify and organize 10 vocabulary words.
- Separately identify Story, Bangla Story Summary, and Story Word Review.
- Preview parsed content before saving.
- Allow editing before saving.
- Automatically assign the next lesson number.

### Vocabulary Library
- Browse all saved vocabulary words.
- Search words.
- Filter vocabulary by Part or Lesson.
- Access word details.
- Manage favorite and difficult words.

### Word Flashcards
- Show English words on the front.
- Show Bangla meanings and examples on the back.
- Previous and Next navigation.
- Shuffle cards.
- Mark words as Known or Need Practice.
- Track flashcard progress.

### Vocabulary Quiz
- English to Bangla
- Bangla to English
- Fill in the blanks
- Synonym challenges
- Antonym challenges
- Select quiz size.
- Display scores, correct answers, incorrect answers, and accuracy.
- Retry incorrect answers.

### Daily Revision
- Daily revision targets.
- Prioritize difficult and previously incorrect words.
- Review vocabulary regularly.
- Track review history and performance.

### Reading Mode
- Read lesson stories in a clean reading interface.
- Highlight target vocabulary words.
- Show word meanings.
- Show or hide Bangla translations.
- Display story summaries and Story Word Review.
- Provide previous and next story navigation.
- Support adjustable font size and reading appearance.

### Progress Tracker
- Total learned words.
- Known and difficult words.
- Completed lessons.
- Quiz performance.
- Revision history.
- Learning streak.
- Weekly learning activity.

### Favorites
- Save important vocabulary words.
- View and revise favorite words.

### Settings
- Theme preferences.
- Learning targets.
- Data backup and restore.
- Application preferences.

## 5. Data Storage and Management

The application is designed primarily for local data storage.

Important requirements:

- Use browser-based local persistence, such as localStorage or IndexedDB, according to the existing implementation.
- Preserve vocabulary, lessons, favorites, quiz history, revision history, and learning progress.
- Refreshing the page must not unnecessarily remove saved data.
- Provide data export and import functionality.
- Avoid unnecessary backend services and paid APIs.

All learning modules should use the same saved vocabulary data.

For example, adding a new lesson should automatically make its vocabulary available in the Vocabulary Library, Flashcards, Quiz, Daily Revision, and Reading Mode wherever applicable.

Do not create separate, duplicated vocabulary datasets for individual features.

## 6. UI and Design Principles

The application should have a modern, minimal, clean, and professional design.

Design inspiration:
- Notion
- Linear
- Modern productivity and learning applications

Important design requirements:

- Responsive desktop and mobile layouts.
- Easy navigation.
- Clear typography.
- Consistent spacing.
- Good readability for both English and Bangla.
- Clean vocabulary cards.
- Consistent colors and components.
- Light and dark themes, if supported by the existing application.

The application should remain comfortable to use on Android phones.

## 7. Technical Development Context

The existing project uses a modern React-based web development environment.

Known development tools and technologies include:

- React
- TypeScript
- Vite
- Tailwind CSS
- Browser-based local data storage

Always inspect the existing source code and package.json before changing dependencies or project configuration.

Do not unnecessarily replace the existing technology stack.

## 8. Important Data Parsing Rules

The lesson parser is one of the most important parts of this application.

It must correctly separate:

1. Vocabulary Word 1
2. Vocabulary Word 2
3. Vocabulary Word 3
4. Vocabulary Word 4
5. Vocabulary Word 5
6. Vocabulary Word 6
7. Vocabulary Word 7
8. Vocabulary Word 8
9. Vocabulary Word 9
10. Vocabulary Word 10
11. Story
12. Bangla Story Summary
13. Story Word Review

Important:
- Story must never become part of Word 10.
- Bangla Story Summary must remain separate.
- Story Word Review must remain separate.
- Each Story Word Review entry must be displayed as an individual bullet point.
- Preserve English and Bangla text.
- Preserve Markdown formatting where possible.
- Support different heading levels and blank lines.

## 9. Rules for Future AI Modifications

Whenever an AI is asked to modify this application, it must follow these rules:

1. First inspect the existing project structure and relevant source code.
2. Understand how the existing functionality works before making changes.
3. Modify only the components or logic related to the requested task whenever possible.
4. Never redesign the entire application unless explicitly requested.
5. Never remove or break existing features.
6. Never delete existing user data.
7. Never replace working functionality with mockups or placeholder implementations.
8. Maintain compatibility between all learning modules.
9. Test the modified functionality.
10. Preserve the existing UI style and responsive behavior.

If a new feature is requested, integrate it with the existing vocabulary and lesson data structure instead of creating an unrelated system.

If a bug is reported, identify and fix its root cause rather than applying an unnecessary workaround.

## 10. Overall Project Vision

Vocabo by Saiful is intended to become a complete personal English vocabulary learning platform.

The long-term vision is to make vocabulary learning more organized, interactive, practical, and measurable.

The application should help users:

- Learn new English words.
- Understand meanings and usage.
- Remember vocabulary through stories.
- Practice with flashcards and quizzes.
- Revise words regularly.
- Improve reading and comprehension.
- Track vocabulary growth and learning progress.

**Core Philosophy: Learn Words. Practice Daily. Build Fluency.**