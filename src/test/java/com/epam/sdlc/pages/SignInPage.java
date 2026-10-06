package com.epam.sdlc.pages;

import com.epam.sdlc.config.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class SignInPage extends BasePage {
  private final By heading = By.xpath("//h2[normalize-space()='Sign In']");
  private final By email = By.cssSelector("input#emailAddress");
  private final By password = By.cssSelector("input#password");
  private final By signInButton = By.cssSelector("form button[type='submit']");
  private final By welcomeText = By.xpath("//header//li[contains(.,'Welcome')]");

  public SignInPage(WebDriver driver) {
    super(driver);
  }

  public SignInPage open() {
    driver.get(TestConfig.UI_BASE_URL + "/signin");
    visible(heading);
    return this;
  }

  public void signIn(String emailValue, String passwordValue) {
    type(email, emailValue);
    type(password, passwordValue);
    click(signInButton);
    visible(welcomeText);
  }
}
