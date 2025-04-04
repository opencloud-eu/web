Feature: check files pagination in personal and project spaces
  As a user
  I want to navigate a large number of files using pagination
  So that I do not have to scroll deep down

  Scenario: pagination in the project space
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" logs in
    And "Alice" creates 55 folders in personal space using API
    And "Alice" creates 55 files in personal space using API
    And "Alice" creates the following files into personal space using API
       | pathToFile           | content                |
       | .hidden-testFile.txt | This is a hidden file. |
    When "Alice" navigates to page "2" of the project space files view
    And "Alice" opens the following file in texteditor
      | resource        |
      | testfile50.txt |
    And "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource        |
      | testfile50.txt |
    And following resources should not be displayed in the files list for user "Alice"
      | resource      |
      | testfile1.txt |
    And "Alice" should see the text "111 items with 1 kB in total (56 files including 1 hidden, 55 folders)" at the footer of the page
    And "Alice" should see 10 resources in the project space files view
    When "Alice" enables the option to display the hidden file
    Then "Alice" should see 11 resources in the project space files view
    When "Alice" changes the items per page to "500"
    Then "Alice" should not see the pagination in the personal space files view

    # copy all resources to project space and check the pagination there
    When "Alice" creates space "New" from all resources using the context menu
    And "Alice" navigates to the project space "New"
    Then "Alice" should not see the pagination in the project space files view
    When "Alice" changes the items per page to "50"
    And "Alice" navigates to page "3" of the project space files view
    And "Alice" opens the following file in texteditor
      | resource        |
      | testfile50.txt |
    And "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource        |
      | testfile50.txt |
    And following resources should not be displayed in the files list for user "Alice"
      | resource      |
      | testfile1.txt |
    And "Alice" should see the text "112 items with 48 kB in total (56 files, 56 folders)" at the footer of the page
    And "Alice" should see 12 resources in the project space files view
    When "Alice" disables the option to display the hidden file
    Then "Alice" should see 10 resources in the project space files view
    And "Alice" logs out
