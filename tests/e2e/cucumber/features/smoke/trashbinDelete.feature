Feature: Trashbin delete
  As a user
  I want to delete files and folders from the trashbin
  So that I can control my trashbin space and which files are kept in that space

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |
    And "Alice" logs in


  Scenario: delete files and folders from trashbin
    Given "Alice" creates the following resources
      | resource     | type   |
      | FOLDER       | folder |
      | PARENT       | folder |
      | PARENT/CHILD | folder |
    And "Alice" uploads the following resources
      | resource               | to           |
      | new-lorem.txt          | FOLDER       |
      | PARENT/parent.txt      | PARENT       |
      | PARENT/simple.pdf      | PARENT       |
      | PARENT/CHILD/child.txt | PARENT/CHILD |
      | data.tar.gz            |              |
      | lorem.txt              |              |
      | lorem-big.txt          |              |
    And "Alice" opens the "files" app
    And "Alice" deletes the following resources using the batch action
      | resource      |
      | FOLDER        |
      | PARENT        |
      | data.tar.gz   |
      | lorem.txt     |
      | lorem-big.txt |
    And "Alice" navigates to the trashbin
    When "Alice" deletes the following resources from trashbin using the batch action
      | resource  |
      | lorem.txt |
      | PARENT    |
    And "Alice" empties the trashbin
    And "Alice" logs out


  Scenario: delete and restore a file inside a received shared folder
    Given "Alice" creates the following folders in personal space using API
      | name          |
      | folderToShare |
      | empty-folder  |
    And "Alice" creates the following files into personal space using API
      | pathToFile              | content     |
      | folderToShare/lorem.txt | lorem ipsum |
      | sample.txt              | sample      |
    And "Alice" opens the "files" app
    And following resources should be displayed in the files list for user "Alice"
      | resource   |
      | sample.txt |
    And "Alice" shares the following resource using the sidebar panel
      | resource      | recipient | type | role     | resourceType |
      | folderToShare | Brian     | user | Can edit | folder       |
    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens folder "folderToShare"
    And following resources should be displayed in the files list for user "Brian"
      | resource  |
      | lorem.txt |
    When "Brian" deletes the following resources using the sidebar panel
      | resource  |
      | lorem.txt |
    And "Brian" navigates to the trashbin
    Then following resources should not be displayed in the trashbin for user "Brian"
      | resource                |
      | folderToShare/lorem.txt |
    When "Alice" deletes the following resources using the sidebar panel
      | resource     |
      | sample.txt   |
      | empty-folder |
    And "Alice" navigates to the trashbin
    Then following resources should be displayed in the trashbin for user "Alice"
      | resource                |
      | folderToShare/lorem.txt |
    And "Alice" restores the following resources from trashbin
      | resource                |
      | folderToShare/lorem.txt |
    And "Alice" restores the following resources from trashbin using the batch action
      | resource                |
      | sample.txt              |
      | empty-folder            |
    And "Alice" opens the "files" app
    And "Alice" opens folder "folderToShare"
    And following resources should be displayed in the files list for user "Alice"
      | resource  |
      | lorem.txt |
    And "Brian" navigates to the shared with me page
    And "Brian" opens folder "folderToShare"
    And following resources should be displayed in the files list for user "Brian"
      | resource  |
      | lorem.txt |
    And "Brian" logs out
    And "Alice" logs out

  
  Scenario: empty trashbin using quick action
    Given "Admin" assigns following roles to the users using API
      | id    | role        |
      | Brian | Space Admin |
    And "Brian" creates the following project space using API
      | name     | id    |
      | sales    | sales |
      | hr       | hr    |
    And "Brian" creates the following folder in space "sales" using API
      | name |
      | f1   |
    And "Brian" logs in

    When "Brian" navigates to the project space "sales"
    And "Brian" deletes the following resources using the sidebar panel
      | resource |
      | f1       |

    And "Brian" navigates to the trashbin
    Then following resources should be displayed in the trashbin for user "Brian"
      | resource |
      | Personal |
      | sales    |
      | hr       |
    And "Brian" should see disabled empty trashbin button for space "Personal"
    
    When "Brian" disables the option to show empty trashbins
    Then following resources should not be displayed in the trashbin for user "Brian"
      | resource |
      | Personal |
      | hr       |
    And "Brian" should see the text "3 trash bins in total (including 2 empty)" at the footer of the trashbin page
    When "Brian" empties the trashbin for space "sales" using quick action
    And "Brian" should see the text "3 trash bins in total (including 3 empty)" at the footer of the trashbin page
    Then following resources should not be displayed in the trashbin for user "Brian"
      | resource |
      | sales    |    
    And "Brian" logs out
