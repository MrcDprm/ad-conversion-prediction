// Eşik ekranı: katlama dışı olasılıklardan karışıklık matrisi, kesinlik, duyarlılık ve ROC eğrisi.

/** Olasılığı eşiğe eşit ya da büyük olanlar "alır" sayılır. */
export function confusionAt(probabilities, labels, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  probabilities.forEach((p, i) => {
    const predicted = p >= threshold;
    if (predicted && labels[i] === 1) tp++;
    else if (predicted) fp++;
    else if (labels[i] === 1) fn++;
    else tn++;
  });
  const total = tp + fp + tn + fn;
  // Kimse seçilmediyse kesinlik tanımsız; 0 sayılır (sklearn'deki zero_division=0 gibi)
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, tn, fn, precision, recall, f1, accuracy: (tp + tn) / total, selected: (tp + fp) / total };
}

/** ROC eğrisi noktaları ([yanlış pozitif oranı, doğru pozitif oranı]) ve eğrinin altındaki alan. */
export function rocCurve(probabilities, labels) {
  const positives = labels.filter((y) => y === 1).length;
  const negatives = labels.length - positives;
  // Eşik yüksekten düşüğe iner; aynı olasılıktakiler tek adımda geçilir
  const order = probabilities.map((p, i) => [p, labels[i]]).sort((a, b) => b[0] - a[0]);
  const points = [[0, 0]];
  let tp = 0;
  let fp = 0;
  for (let k = 0; k < order.length; k++) {
    if (order[k][1] === 1) tp++;
    else fp++;
    if (k === order.length - 1 || order[k + 1][0] !== order[k][0]) points.push([fp / negatives, tp / positives]);
  }
  let auc = 0;
  for (let k = 1; k < points.length; k++) {
    auc += (points[k][0] - points[k - 1][0]) * (points[k][1] + points[k - 1][1]) / 2;
  }
  return { points, auc };
}
