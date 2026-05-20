Feature: Work with an rclone-crypt encrypted vault
  As a user with rclone-crypt-encrypted folders on the server
  I want to browse, edit and upload through OpenCloud Web under cleartext names
  So that I can work with my encrypted files without decrypting them manually

  @rclone-crypt
  Scenario: Browse a vault and see decrypted folder/file names
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path           | content              |
      | hello.txt      | hello world          |
      | sub/nested.txt | nested file content  |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    Then following resources should be displayed in the files list for user "Admin"
      | resource      |
      | myvault.vault |
    When "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    Then following resources should be displayed in the files list for user "Admin"
      | resource  |
      | hello.txt |
      | sub       |
    When "Admin" opens folder "sub"
    Then following resources should be displayed in the files list for user "Admin"
      | resource   |
      | nested.txt |
    When "Admin" opens the following file in texteditor
      | resource   |
      | nested.txt |
    Then "Admin" should see the text editor content "nested file content"

    When "Admin" replaces the text editor content with "rewritten through the vault"
    And "Admin" saves the text editor file
    Then the rclone-crypt vault "myvault.vault" file "sub/nested.txt" should decrypt to "rewritten through the vault"

  @rclone-crypt
  Scenario: Upload a file into a vault encrypts it on the server
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path           | content              |
      | hello.txt      | hello world          |
      | sub/nested.txt | nested file content  |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    And "Admin" opens folder "sub"
    And "Admin" uploads a file named "uploaded.txt" with content "freshly uploaded content" via the upload button
    Then following resources should be displayed in the files list for user "Admin"
      | resource     |
      | nested.txt   |
      | uploaded.txt |
    And the rclone-crypt vault "myvault.vault" file "sub/uploaded.txt" should decrypt to "freshly uploaded content"

  @rclone-crypt
  Scenario: Drag-drop a directory tree into a vault
    Given "Admin" creates an rclone-crypt vault "myvault.vault" in personal space with the following content
      | path      | content     |
      | hello.txt | hello world |
    When "Admin" logs in
    And "Admin" navigates to the personal space page
    And "Admin" enters the vault "myvault.vault" with passphrase "foobar"
    And "Admin" drag-drop uploads the following directory tree
      | path                       | content        |
      | mybundle/inner.txt         | inner content  |
      | mybundle/deeper/nested.txt | deeper content |
    Then the rclone-crypt vault "myvault.vault" file "mybundle/inner.txt" should decrypt to "inner content"
    And the rclone-crypt vault "myvault.vault" file "mybundle/deeper/nested.txt" should decrypt to "deeper content"
