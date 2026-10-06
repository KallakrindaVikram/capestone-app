package com.epam.sdlc.pages;

import com.epam.sdlc.config.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class CourseDetailPage extends BasePage {
  private final By heading = By.xpath("//h2[normalize-space()='Course Detail']");
  private final By favoriteButton = By.xpath("//button[normalize-space()='Favorite']");
  private final By unfavoriteButton = By.xpath("//button[normalize-space()='Unfavorite']");

  public CourseDetailPage(WebDriver driver) {
    super(driver);
  }

  public CourseDetailPage open(long id) {
    driver.get(TestConfig.UI_BASE_URL + "/courses/" + id);
    visible(heading);
    return this;
  }

  // The button label flips after an async API call, so wait briefly before deciding it is absent
  public boolean canSeeFavorite() {
    return appears(favoriteButton);
  }

  public boolean canSeeUnfavorite() {
    return appears(unfavoriteButton);
  }

  private boolean appears(By locator) {
    try {
      new WebDriverWait(driver, Duration.ofSeconds(5)).until(ExpectedConditions.visibilityOfElementLocated(locator));
      return true;
    } catch (TimeoutException e) {
      return false;
    }
  }

  public void clickFavorite() {
    click(favoriteButton);
  }

  public void clickUnfavorite() {
    click(unfavoriteButton);
  }
}
