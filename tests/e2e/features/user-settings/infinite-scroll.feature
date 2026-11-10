Feature: check infinite scrolling in the files views
  As a user
  I want to browse through long lists by scrolling instead of clicking through numbered pages
  So that the file list is not interrupted while I am reading through it

  Scenario: infinite scrolling in the personal space files view
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates 120 files in personal space using API
    And "Alice" logs in
    When "Alice" changes the items per page to "∞"
    And "Alice" should not see the pagination in the files list
    And "Alice" should see 100 resources in the files list
    And "Alice" scrolls down the files list
    And "Alice" should see 120 resources in the files list
    # everything fits, so the load indicator disappears
    And "Alice" scrolls down the files list until all items are loaded
    And "Alice" should see 120 resources in the files list
    # switching back to numbered pagination renders the last viewed page
    And "Alice" changes the items per page to "100"
    And "Alice" should see the pagination in the files list
    And "Alice" should see 20 resources in the files list
    And "Alice" logs out

  Scenario: infinite scrolling in the trashbin
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates 120 files in personal space using API
    And "Alice" logs in
    And "Alice" deletes all files
    And "Alice" navigates to the trashbin
    When "Alice" changes the items per page to "∞"
    And "Alice" scrolls down the files list until all items are loaded
    And "Alice" should see 120 resources in the files list
    And "Alice" logs out
