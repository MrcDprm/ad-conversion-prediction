English | [Türkçe](README.tr.md)

# Ad Conversion Prediction

Predict whether someone who sees an ad will buy the product, from their age and estimated salary. A Python pipeline compares classification models with repeated cross-validation; a small website shows each model's decision map, lets you move the decision threshold and runs in the browser.

> **Status:** v1.0 in progress. This README is the project plan and will be completed before release.
>
> **About the data:** a widely used teaching dataset of 400 people (`Social_Network_Ads.csv`). It is not data from a real campaign, so the results show how the methods work, not how real customers behave.

## Features

### Training pipeline (Python)
- Data validation: schema, value ranges and categories are checked before training.
- Model comparison with repeated stratified 10-fold cross-validation: logistic regression, logistic regression with polynomial features, KNN, SVM (RBF), Random Forest and a baseline that always predicts "does not buy".
- Metrics as mean ± standard deviation: ROC AUC, F1, precision, recall and accuracy; accuracy is shown next to the baseline because it is misleading on imbalanced data.
- Gender is left out of the model: it adds no information here, and using it to target ads raises a fairness question. The comparison with and without it is part of the report.
- Export to JSON: each model's probability on a 100×100 age × salary grid, its cross-validated scores and its out-of-fold predictions for the threshold view.
- Unit tests with pytest.

### Website
- Decision map: the probability of buying over age and salary for each model, the 400 people in the data and your own point.
- Prediction for an age and salary you enter, with a warning outside the range of the data.
- Threshold slider ("who should see the ad?"): precision, recall, confusion matrix and ROC curve update as you move it.
- Model page: comparison table, why accuracy misleads, the gender decision and a model card (data source, limitations, intended use).
- Turkish / English, dark / light theme. Nothing you enter is sent or stored.

## Dataset

400 people: gender, age, estimated salary and whether they bought the advertised product (143 bought, 257 did not). A common teaching dataset; its original source is not documented.

## Screenshots

_Coming soon._

## Tech Stack

- Python, pandas, NumPy, scikit-learn, pytest
- HTML, CSS, JavaScript (no framework, no build step), `node --test`
- Vercel

## Installation

_Coming soon._

## What I Learned

_Coming soon._

## Future Plans

- Upload your own CSV with two numeric columns and a yes/no target.
- Probability calibration plot.
- More datasets.
