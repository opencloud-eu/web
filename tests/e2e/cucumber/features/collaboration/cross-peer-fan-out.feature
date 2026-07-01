Feature: Peer-save fan-out via _oc_meta
  As two users editing the same file
  I want a save in one tab to mark the other tab clean
  So that I don't see a stale "save changes?" prompt and don't 412 on my next save

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: Alice saves, Brian sees the new state and his next save uses the fresh etag
    And "Alice" creates the following files into personal space using API
      | pathToFile  | content                  |
      | fanout.md   | initial fan-out content  |
    And "Alice" shares the following resource using API
      | resource  | recipient | type | role     |
      | fanout.md | Brian     | user | Can edit |
    When "Alice" logs in
    And "Alice" opens file "fanout.md" via "text-editor" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens file "fanout.md" via "text-editor" using the context menu
    Then "Brian" should see the realtime collab status "connected"
    And "Brian" should see content "initial fan-out content" in the "text-editor" editor
    When "Alice" types "ALICE-SAVED" at the end of the "text-editor" editor
    Then "Brian" should see content "ALICE-SAVED" in the "text-editor" editor
    When "Alice" saves the current file with Ctrl+S
    Then the file "fanout.md" in "Alice"'s personal space should contain "ALICE-SAVED"
    # _oc_meta.lastSavedAt + .etag propagate via CRDT to Brian's wrapper, which
    # emits update:serverContent + update:etag. Brian's local content now
    # matches serverContent (isDirty == false) and currentETag is current, so
    # when Brian types more and saves, the PUT goes straight through without
    # the 412 -> refetch -> retry recovery loop.
    When "Brian" types "BRIAN-ADDED" at the end of the "text-editor" editor
    And "Brian" saves the current file with Ctrl+S
    Then the file "fanout.md" in "Alice"'s personal space should contain "BRIAN-ADDED"
    And the file "fanout.md" in "Alice"'s personal space should contain "ALICE-SAVED"
    And "Alice" logs out
    And "Brian" logs out
