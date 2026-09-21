Feature: guest invite

  Scenario: invite a guest by email address and manage the share
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" creates the following folder in personal space using API
      | name         |
      | guest_folder |
    And "Alice" logs in
    When "Alice" shares the following resource using the sidebar panel
      | resource     | recipient         | type  | role     | resourceType |
      | guest_folder | guest@example.org | guest | Can edit | folder       |
    Then "Alice" should see the following recipient
      | resource     | recipient         | type  |
      | guest_folder | guest@example.org | guest |
    When "Alice" navigates to the shared with others page
    Then following resource should be displayed in the files list for user "Alice"
      | resource     |
      | guest_folder |
    When "Alice" updates following sharee role
      | resource     | recipient         | type  | role     | resourceType |
      | guest_folder | guest@example.org | guest | Can view | folder       |
    And "Alice" sets the expiration date of share "guest_folder" of guest "guest@example.org" to "+5 days"
    Then "Alice" checks the following access details of share "guest_folder" for guest "guest@example.org"
      | Name | guest@example.org |
      | Type | Guest             |
    When "Alice" removes following sharee
      | resource     | recipient         | type  |
      | guest_folder | guest@example.org | guest |
    And "Alice" logs out
