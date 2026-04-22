# Paint MVP — User Guide

This app helps you find houses that need a fresh coat of paint. You enter a ZIP code, the app pulls property images and checks them automatically, and you get a list of houses flagged for repainting. You can also review each house yourself and add your own notes.

---

## Table of Contents

1. [Signing In](#signing-in)
2. [Searching a ZIP Code](#searching-a-zip-code)
3. [Browsing the Results](#browsing-the-results)
4. [Looking at a Property](#looking-at-a-property)
5. [Reviewing a Property Image](#reviewing-a-property-image)
6. [Adding Your Own Notes](#adding-your-own-notes)
7. [Going Back to a Past Search](#going-back-to-a-past-search)
8. [Analytics Page](#analytics-page)
9. [Usage Page](#usage-page)

---

## Signing In

When you first open the app you will land on the login page.

1. Enter your **Email** and **Password**
2. Click **Sign in**

If something is wrong with your details, a message will appear below the form telling you what went wrong.

**Don't have an account yet?** Go to `/register`, fill in a **Username**, **Email**, and **Password**, then click **Create account**.

**To sign out:** click the red **Logout** button in the top-right corner of any page.

---

## Searching a ZIP Code

The main page has a simple search form. Here's how to use it:

### Step 1 — Pick a mode

There are two buttons at the top of the form:

- **Run Pipeline** — use this when you want fresh results. The app will go out, fetch the property images, and analyze them. This takes a little time.
- **View Stored Results** — use this if you've already run the pipeline for this ZIP code before and just want to see the saved results again. Much faster.

Click one to select it — it turns blue when active.

### Step 2 — Enter the ZIP code

Type the 5-digit ZIP code into the **ZIP Code** box. This is required.

If you're using **Run Pipeline**, you can also set a **Limit** — this is the maximum number of properties you want to analyze. Leave it blank to get all available results.

### Step 3 — Click Search

Hit the **Search** button. While the app is working, a loading spinner appears on the button and a small message pops up in the bottom-right corner of the screen.

**What the messages mean:**
- Dark message — the job has started and is running
- Green message — everything finished successfully
- Red message — something went wrong

These messages disappear on their own after a few seconds. You can also close them early by clicking the **×** on them.

---

## Browsing the Results

Once the search is done, the properties appear in a grid of cards.

### Filtering

At the top of the results there are three filter tabs:

| Tab | What it shows |
|---|---|
| **All** | Every property found |
| **Needs Repaint** | Only properties the AI flagged as needing paint work |
| **Acceptable** | Only properties that look fine |

Each tab shows a number in brackets — that's the count for that group. Click a tab to switch. The active one has a blue underline.

### Flipping through pages

If there are more than 12 properties, they're split across pages. Use these buttons at the bottom:

- **First** — jump to page 1
- **Previous** — go back one page
- **Next** — go forward one page
- **Last** — jump to the last page

The current page is shown in the middle (e.g., *"Page 2 of 5"*).

---

## Looking at a Property

Each card in the grid shows one property.

### The images

Properties are photographed from multiple angles (e.g., front, side, back). You can flip through them using the **‹** and **›** arrows on the left and right sides of the image. The label in the top-left shows which angle you're viewing and what the AI thinks (e.g., *"90° — House"*). The counter in the bottom-center shows where you are (e.g., *"2 / 4"*).

Click any image to open it full-screen.

### The details below the image

- **Address** — the property's street address
- **Lat / Lon** — the coordinates (useful for mapping)
- **Defects** — a short list of any issues the AI spotted, with a confidence percentage for each. If nothing was detected it says *"No defects detected."*

---

## Reviewing a Property Image

When you click an image, it opens in a full-screen viewer.

### Getting around

| What you want to do | How |
|---|---|
| Close the image | Click the **×** in the top-left, or press **Esc** |
| See the next image | Click the **›** button, or press the **→** key |
| See the previous image | Click the **‹** button, or press the **←** key |

At the bottom of the screen you'll see the angle and which image number you're on (e.g., *"0° — House / 1 of 4"*).

### Opening the notes panel

Click the **Notes** button in the top-right corner. A panel slides in from the right where you can review the AI's assessment and add your own input. Click **Notes** again to close it.

---

## Adding Your Own Notes

The Notes panel is where you can review what the AI found and record your own judgment.

### What the AI says

At the top of the panel you'll see the **AI Assessment** — a coloured box showing whether the AI thinks the property needs repainting, along with a confidence percentage and a brief explanation. This is just a suggestion — you can agree or override it.

### Your label

Below the AI assessment, pick one of three buttons to record your own verdict:

- **Ok** — the paint looks fine
- **Needs Repaint** — this property needs work
- **Error** — the image is unclear or the AI result doesn't look right

The button you select fills with colour and shows a checkmark. If the AI made a prediction, a purple ring shows which button it recommends.

### Is this a house?

Tell the app whether the image actually shows a house:

- **House** — yes, there's a house in this image (this lets you tag defects)
- **Not a House** — the image shows something else (a street, a car, etc.)

If you select **Not a House**, the defect buttons below will be greyed out.

### Tagging defects

If the image shows a house, you can tag what kind of issues you see:

- **Paint Defects**
- **Delamination** (paint peeling or flaking off)
- **Cracks**
- **Dirt, Algae, and Mold**

Click a button to select it — a checkmark appears. Click again to deselect. The AI may have pre-selected some tags for you (shown with a purple ring).

### Adding a comment

Use the **Comments** box to write anything else you want to note about this property. You can type up to 500 characters. The count below the box shows how many you've used.

### Looking up Street View info

Click **Fetch Metadata** to pull up Google Street View details for this address — like when the photo was taken and the exact coordinates. If Street View doesn't cover this location, a warning will appear. Click **Clear** to remove the data.

### Saving your notes

- Click **Save** to save everything. A green *"✓ All changes saved"* message confirms it worked.
- Click **Clear** to wipe your notes and start over for this image.

---

## Going Back to a Past Search

The **History sidebar** on the left side of the screen keeps a list of all your previous searches.

### Opening it

- **On desktop:** click the **›** chevron on the left edge to expand the sidebar. Click **‹** to collapse it.
- **On mobile:** tap the floating button in the top-left corner to open it. Tap outside the sidebar to close it.

### Picking a past search

Each item in the list shows the ZIP code and when the search was run. Click one to reload those results. On mobile the sidebar closes automatically when you select one.

### Starting fresh

Click the **pencil icon** at the top of the sidebar to clear the current results and start a new search.

### Seeing more history

If you have more than 20 past searches, a **Load more** button appears at the bottom. Click it to show the next 20.

---

## Analytics Page

Click the green **Analytics** button in the top-right corner of the home page to see an overview of all the data collected so far.

### Filtering the data

At the top you can narrow things down:

- **ZIP Code** — focus on a specific area
- **Model** — pick a specific AI model or leave it on *"All Models"*

Click **Apply Filters** (or press Enter) to update the page.

### The summary cards

Four numbers at the top give you a quick overview:

| Card | What it means |
|---|---|
| **Total Properties** | How many properties have been analyzed |
| **Needs Work** | How many (and what %) need repainting |
| **Acceptable** | How many (and what %) look fine |
| **Model Accuracy** | How often the AI agreed with human reviewers |

### The charts

| Chart | What it shows |
|---|---|
| **Overall Condition Distribution** | A pie chart — what share of properties need paint vs are ok |
| **Model Confidence** | A bar chart — how confident the AI was across all its predictions |
| **Model Comparison** | A side-by-side chart comparing different AI models |
| **30-Day Trend** | A line chart showing how results have changed over the last month |
| **Geographic Breakdown** | A table by ZIP code. The % column is colour-coded: green = mostly ok, yellow = mixed, red = mostly needs work |

### Human vs AI comparison

If human reviewers have checked properties, a section appears showing how well the AI matched their judgments:

- **Overall Agreement** — what % of the time they agreed
- **False Positives** — the AI said "needs repaint" but the human said it's fine
- **False Negatives** — the AI said it's fine but the human said "needs repaint"
- **Confusion Matrix** — a full breakdown of every AI prediction vs every human label, colour-coded green (match) and red (mismatch)

---

## Usage Page

Click **Usage** in the left sidebar on the Analytics page to see how much the app's backend services have been used.

### Filtering

- **From / To** — set a date range (defaults to the last 30 days)
- **Service** — filter by a specific service or see all
- **Request ID** — look up a specific request (type and press Enter)

Click **Apply Filters** to refresh.

### Summary cards

| Card | What it means |
|---|---|
| **Total Calls** | How many times a service was called |
| **Total Spend** | Total cost in USD |
| **Avg Duration** | Average time each call took |
| **Total Duration** | Total time across all calls |
| **Errors** | How many calls failed (turns red if any) |

### Per-service breakdown

Each service gets its own card showing its call count, error count, speed, and cost. A bar shows its share of the total usage.

### Events log

A table of every individual call made. You can page through it using **← Prev** and **Next →** (25 rows at a time). The table shows when each call happened, which service handled it, whether it succeeded or failed, and how long it took.
