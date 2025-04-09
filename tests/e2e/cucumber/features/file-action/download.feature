Feature: Download
  As a user
  I want to download resources


  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: download resources
    And "Alice" creates the following folders in personal space using API
      | name         |
      | folderPublic |
      | emptyFolder  |
    And "Alice" creates the following files into personal space using API
      | pathToFile                | content     |
      | folderPublic/new file.txt | lorem ipsum |
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to             |
      | testavatar.jpg | testavatar.jpg |
    And "Alice" shares the following resource using API
      | resource       | recipient | type | role     |
      | folderPublic   | Brian     | user | Can edit |
      | emptyFolder    | Brian     | user | Can edit |
      | testavatar.jpg | Brian     | user | Can edit |

    When "Alice" logs in
    And "Alice" downloads the following resources using the batch action
      | resource       | type   |
      | folderPublic   | folder |
      | emptyFolder    | folder |
      | testavatar.jpg | file   |
    And "Alice" opens the following file in mediaviewer
      | resource       |
      | testavatar.jpg |
    And "Alice" downloads the following resources using the preview topbar
      | resource       | type |
      | testavatar.jpg | file |
    And "Alice" closes the file viewer
    And "Alice" logs out

    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" downloads the following resources using the batch action
      | resource       | type   |
      | folderPublic   | folder |
      | emptyFolder    | folder |
      | testavatar.jpg | file   |
    And "Brian" downloads the following resources using the sidebar panel
      | resource       | from         | type   |
      | new file.txt   | folderPublic | file   |
      | testavatar.jpg |              | file   |
      | folderPublic   |              | folder |
      | emptyFolder    |              | folder |
    And "Brian" opens the following file in mediaviewer
      | resource       |
      | testavatar.jpg |
    And "Brian" downloads the following resources using the preview topbar
      | resource       | type |
      | testavatar.jpg | file |
    And "Brian" logs out


  Scenario: download large archive
    Given the user creates a file "largefile500Mb.txt" of "500MB" size in the temp upload directory
    And the user creates a file "largefile400Mb.txt" of "400MB" size in the temp upload directory
    And the user creates a file "largefile300Mb.txt" of "300MB" size in the temp upload directory
    And "Alice" uploads the following local file into personal space using API
      | localFile                     | to             |
      | temp/largefile500Mb.txt | largefile500Mb.txt |
      | temp/largefile400Mb.txt | largefile400Mb.txt |
      | temp/largefile300Mb.txt | largefile300Mb.txt |
    When "Alice" logs in
    And "Alice" downloads the following resources using the batch action
      | resource          | type |
      | largefile500Mb.txt | file |
      | largefile400Mb.txt | file |
    When "Alice" selects all files
    Then the download button should be disabled for user "Alice" with the tooltip:
      """
      The selection exceeds the allowed archive size (max. 1.1 GB)
      """
    And "Alice" logs out

  
  @posix
  Scenario: download large archive using adding files with posix-watch-fs
    Given "Alice" creates the following files into personal space using API
      | pathToFile | content     |
      | new.txt | new content |
    And "Alice" creates following files using CLI:
      | resource         | size |
      | testfile500Mb.bin| 500  |
      | testfile400Mb.bin| 400  |
      | testfile300Mb.bin| 300  |
    When "Alice" logs in
    And "Alice" downloads the following resources using the batch action
      | resource          | type |
      | testfile500Mb.bin | file |
      | testfile400Mb.bin | file |
    When "Alice" selects all files
    Then the download button should be disabled for user "Alice" with the tooltip:
      """
      The selection exceeds the allowed archive size (max. 1.1 GB)
      """
    And "Alice" logs out
