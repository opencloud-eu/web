Feature: Open an empty Markdown file in Tiptap
  As a user
  I want to open an empty .md file in Tiptap
  So that I can start writing rich content from scratch

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: empty .md opens cleanly and accepts input
    And "Alice" creates the following files into personal space using API
      | pathToFile     | content |
      | empty-note.md  |         |
    When "Alice" logs in
    And "Alice" opens file "empty-note.md" via "tiptap" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    When "Alice" types "hello from empty" at the end of the "tiptap" editor
    Then "Alice" should see content "hello from empty" in the "tiptap" editor
    And "Alice" logs out
