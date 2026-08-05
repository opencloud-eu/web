Feature: check pagination in files, spaces and trash overviews
  As a user
  I want to navigate a large number of items using pagination
  So that I do not have to scroll deep down

  Scenario: pagination in the personal and project space files view
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" logs in
    And "Alice" creates 55 folders in personal space using API
    And "Alice" creates 55 files in personal space using API
    And "Alice" creates the following file into personal space using API
       | pathToFile           | content                |
       | .hidden-testFile.txt | This is a hidden file. |
    When "Alice" navigates to page "2" of the personal space files view
    And "Alice" opens the following file in texteditor
      | resource        |
      | testfile50.txt |
    And "Alice" closes the file viewer
    Then following resource should be displayed in the files list for user "Alice"
      | resource        |
      | testfile50.txt |
    And following resource should not be displayed in the files list for user "Alice"
      | resource      |
      | testfile1.txt |
    And "Alice" should see the text "111 items with 1 kB in total (56 files including 1 hidden, 55 folders)" at the footer of the page
    And "Alice" should see 10 resources in the personal space files view
    And "Alice" enables the option to display the hidden file
    And "Alice" should see 11 resources in the personal space files view
    And "Alice" changes the items per page to "500"
    And "Alice" should not see the pagination in the personal space files view

    # copy all resources to project space and check the pagination there
    And "Alice" creates space "New" from all resources using the context menu
    And "Alice" navigates to the project space "New"
    And "Alice" should not see the pagination in the project space files view
    And "Alice" changes the items per page to "50"
    And "Alice" navigates to page "3" of the project space files view
    And "Alice" opens the following file in texteditor
      | resource        |
      | testfile50.txt |
    And "Alice" closes the file viewer
    And following resource should be displayed in the files list for user "Alice"
      | resource        |
      | testfile50.txt |
    And following resource should not be displayed in the files list for user "Alice"
      | resource      |
      | testfile1.txt |
    And "Alice" should see the text "112 items with 12 kB in total (56 files, 56 folders)" at the footer of the page
    And "Alice" should see 12 resources in the project space files view
    And "Alice" disables the option to display the hidden file
    And "Alice" should see 10 resources in the project space files view
    And "Alice" logs out


  Scenario: pagination in the trashbin
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" creates 55 files in personal space using API
    And "Alice" deletes all files
    When "Alice" navigates to the trashbin
    Then "Alice" should not see the pagination in the spaces list
    And "Alice" changes the items per page to "20"
    And "Alice" should see 20 resources in the files list
    And "Alice" should see the pagination in the spaces list
    And "Alice" navigates to page "3" of the files list
    And "Alice" should see 15 resources in the spaces list
    And "Alice" logs out


  Scenario: pagination in the project spaces overview
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates 22 project spaces using API
    And "Alice" logs in
    When "Alice" navigates to the projects space page
    Then "Alice" should not see the pagination in the spaces list
    And "Alice" changes the items per page to "20"
    And "Alice" should see the pagination in the spaces list
    And "Alice" should see 20 resources in the files list
    And "Alice" navigates to page "2" of the files list
    And "Alice" should see 2 resources in the spaces list
    And "Alice" logs out
