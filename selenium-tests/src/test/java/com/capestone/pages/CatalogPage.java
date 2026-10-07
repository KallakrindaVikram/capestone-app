package com.capestone.pages;

import com.capestone.testsupport.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.util.List;

public class CatalogPage {
  private final WebDriver driver;
  private final WebDriverWait wait;

  private final By toolbar = By.cssSelector(".catalog--toolbar");
  private final By loading = By.cssSelector(".loading");
  // The "New Course" tile also links under /courses/, so cards are matched by their own class
  private final By courseCards = By.cssSelector("a.course--link");
  private final By courseTitles = By.cssSelector("a.course--link .course--title");
  private final By emptyState = By.cssSelector(".empty--state");

  private final By searchInput = By.id("catalog-search");
  private final By searchButton = By.cssSelector(".catalog--search button[type='submit']");
  private final By clearButton = By.xpath("//form[contains(@class,'catalog--search')]//button[normalize-space()='Clear']");
  private final By ownerSelect = By.id("catalog-owner");
  private final By sortSelect = By.id("catalog-sort");

  private final By pagination = By.cssSelector("nav.pagination");
  private final By paginationStatus = By.cssSelector("nav.pagination .pagination--status");
  private final By previousButton = By.xpath("//nav[contains(@class,'pagination')]//button[normalize-space()='Previous']");
  private final By nextButton = By.xpath("//nav[contains(@class,'pagination')]//button[normalize-space()='Next']");

  public CatalogPage(WebDriver driver, WebDriverWait wait) {
    this.driver = driver;
    this.wait = wait;
  }

  public CatalogPage open() {
    return openWithQuery("");
  }

  public CatalogPage openWithQuery(String queryString) {
    String qs = queryString == null || queryString.isEmpty() ? ""
        : (queryString.startsWith("?") ? queryString : "?" + queryString);
    driver.get(TestConfig.UI_BASE_URL + "/courses" + qs);
    wait.until(ExpectedConditions.visibilityOfElementLocated(toolbar));
    waitForResults();
    return this;
  }

  // ---- actions -----------------------------------------------------------------------------

  public CatalogPage search(String keyword) {
    WebElement input = wait.until(ExpectedConditions.visibilityOfElementLocated(searchInput));
    input.clear();
    input.sendKeys(keyword);
    return reloadAfter(() -> driver.findElement(searchButton).click());
  }

  public CatalogPage clearSearch() {
    wait.until(ExpectedConditions.visibilityOfElementLocated(searchInput));
    return reloadAfter(() -> driver.findElement(clearButton).click());
  }

  public CatalogPage selectOwnerByVisibleText(String ownerName) {
    WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(ownerSelect));
    // Owner options are loaded asynchronously; wait for more than just "All Owners"
    wait.until(d -> new Select(el).getOptions().size() > 1);
    return reloadAfter(() -> new Select(el).selectByVisibleText(ownerName));
  }

  public CatalogPage selectSortByVisibleText(String sortName) {
    WebElement el = wait.until(ExpectedConditions.visibilityOfElementLocated(sortSelect));
    return reloadAfter(() -> new Select(el).selectByVisibleText(sortName));
  }

  public CatalogPage nextPage() {
    WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(nextButton));
    return reloadAfter(btn::click);
  }

  public CatalogPage previousPage() {
    WebElement btn = wait.until(ExpectedConditions.elementToBeClickable(previousButton));
    return reloadAfter(btn::click);
  }

  // ---- state -------------------------------------------------------------------------------

  public boolean isNextDisabled() {
    return !driver.findElement(nextButton).isEnabled();
  }

  public boolean isPreviousDisabled() {
    return !driver.findElement(previousButton).isEnabled();
  }

  public boolean isPaginationShown() {
    return !driver.findElements(pagination).isEmpty();
  }

  public String paginationStatusText() {
    return wait.until(ExpectedConditions.visibilityOfElementLocated(paginationStatus)).getText().trim();
  }

  public int getCourseCardCount() {
    return driver.findElements(courseCards).size();
  }

  public List<String> getCourseTitlesFromCards() {
    return driver.findElements(courseTitles).stream().map(e -> e.getText().trim()).toList();
  }

  public boolean isEmptyStateShown() {
    return !driver.findElements(emptyState).isEmpty();
  }

  public String emptyStateText() {
    return driver.findElement(emptyState).getText().trim();
  }

  public boolean isToolbarShown() {
    return !driver.findElements(toolbar).isEmpty();
  }

  public String searchInputValue() {
    return driver.findElement(searchInput).getAttribute("value");
  }

  public String selectedOwnerText() {
    return new Select(driver.findElement(ownerSelect)).getFirstSelectedOption().getText().trim();
  }

  public String selectedSortText() {
    return new Select(driver.findElement(sortSelect)).getFirstSelectedOption().getText().trim();
  }

  public CourseDetailPage openFirstCourse() {
    List<WebElement> links = wait.until(ExpectedConditions.numberOfElementsToBeMoreThan(courseCards, 0));
    links.get(0).click();
    return new CourseDetailPage(driver, wait).waitForLoad();
  }

  public String currentUrl() {
    return driver.getCurrentUrl();
  }

  // ---- waiting -----------------------------------------------------------------------------

  /**
   * Runs an action that triggers a catalog refetch, then waits for the refetched results.
   * While loading, React unmounts the results, so the marker element captured beforehand goes stale;
   * this avoids reading the previous results by mistake.
   */
  private CatalogPage reloadAfter(Runnable action) {
    WebElement marker = currentResultsMarker();
    action.run();
    wait.until(ExpectedConditions.stalenessOf(marker));
    waitForResults();
    return this;
  }

  private WebElement currentResultsMarker() {
    List<WebElement> cards = driver.findElements(courseCards);
    if (!cards.isEmpty()) {
      return cards.get(0);
    }
    return wait.until(ExpectedConditions.visibilityOfElementLocated(emptyState));
  }

  /** Waits until loading has finished and either course cards or the empty state are displayed. */
  private void waitForResults() {
    wait.until(d -> d.findElements(loading).isEmpty()
        && (!d.findElements(courseCards).isEmpty() || !d.findElements(emptyState).isEmpty()));
  }
}
