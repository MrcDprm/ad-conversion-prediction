# Reklam Dönüşüm Tahmini

[English](README.md) | **Türkçe**

Reklamı gören birinin ürünü alıp almayacağını yaşından ve maaşından tahmin eder. Python ile yazılan makine öğrenmesi hattı beş sınıflandırıcıyı tekrarlı, sınıf oranını koruyan çapraz doğrulamayla karşılaştırır ve olasılık haritalarını dışa aktarır; küçük bir web sitesi her modelin karar haritasını yarım ton noktalarla çizer, karar eşiğini kaydırmana izin verir ve kaydırdıkça kesinlik, duyarlılık, karışıklık matrisi ve ROC eğrisini gösterir.

**Canlı demo:** [conversion.miracdeprem.com](https://conversion.miracdeprem.com)

![Hesaplayıcı: yaş ve maaş, satın alma olasılığı ve yarım ton karar haritası](docs/screenshot-calculator.png)

> **Veri hakkında:** 400 kişilik, yaygın kullanılan bir eğitim veri seti (`Social_Network_Ads.csv`). Gerçek bir kampanyanın verisi değildir; sonuçlar gerçek müşterilerin davranışını değil, yöntemlerin nasıl çalıştığını gösterir.

## Özellikler

**Web sitesi**
- Girdiğin yaş ve maaş için satın alma olasılığı; verinin aralığı dışında uyarı
- Karar haritası: beş modelin her biri için yaş × maaş düzleminde olasılık, alanı olasılıkla büyüyen yarım ton noktalarla; eşiğin üstündeki noktalar pembeleşir (reklam gösterilir)
- Eşik kaydırıcı ("reklamı kim görsün?"): sade dille karışıklık matrisi (doğru hedef, boşa gösterim, kaçan alıcı, doğru eleme), kesinlik, duyarlılık, F1 ve ROC eğrisi kaydırdıkça güncellenir
- Model sayfası: karşılaştırma tablosu, bu veride doğruluğun neden yanılttığı, bütün modellerin ROC eğrileri, cinsiyet kontrolü ve model kartı
- Kendi adreslerinde Türkçe ve İngilizce, açık ve koyu tema, telefonda ve klavyeyle çalışır
- Sunucu yok: her şey üç JSON dosyasıyla tarayıcıda çalışır; girdiğin hiçbir şey gönderilmez ya da saklanmaz

**Eğitim hattı**
- Veriyi doğrular (sütunlar, cinsiyet değerleri, aralıklar, iki sınıfı da olan 0/1 hedef) ve kullanıcı kimliğini atar
- Lojistik regresyonu, 2. derece özellikli lojistik regresyonu, k değeri iç içe aramayla seçilen KNN'i, RBF çekirdekli SVM'i ve Random Forest'ı hep "almaz" diyen bir referans modelle karşılaştırır
- Tekrarlı, sınıf oranını koruyan 10 katlı çapraz doğrulama (50 bölme); ROC AUC, F1, kesinlik, duyarlılık ve doğruluk
- Cinsiyetin katkı vermediğini göstermek için aynı karşılaştırmayı cinsiyet ekleyerek de yapar
- Her modelin olasılıklarını 101 × 101'lik yaş × maaş ızgarasında ve eşik ekranı için katlama dışı tahminleri dışa aktarır
- Ortak test verileri JavaScript'i scikit-learn ile karşılaştırır (ızgara okuma, karışıklık matrisleri, ROC AUC)

## Ekran Görüntüleri

| | |
|---|---|
| ![Düz lojistik regresyon düz bir sınır çizer](docs/screenshot-linear.png) | ![Karışıklık matrisi, kesinlik, duyarlılık ve ROC eğrisiyle eşik paneli](docs/screenshot-threshold.png) |
| ![Model karşılaştırma sayfası](docs/screenshot-model.png) | ![Koyu tema, Türkçe](docs/screenshot-dark.png) |

<p align="center"><img src="docs/screenshot-mobile.png" width="300" alt="Telefonda hesaplayıcı"></p>

## Nasıl Çalışır

```
data/social-network-ads.csv ──► doğrula ──► 5 modeli karşılaştır ──► seç ──► dışa aktar ──► web/metrics.json
                                           (sınıf oranlı 10 katlı      (1-SE kuralı,         web/grid.json  (model başına 101 × 101)
                                            CV × 5, ± cinsiyet)         ROC AUC)             web/data.json  (noktalar + katlama dışı)
                                                                                                  │
tarayıcı: yaş + maaş ──► ızgaradan bilinear okuma ──► olasılık, harita, eşik metrikleri, ROC
```

1. **Doğrula.** [`adconv/data.py`](adconv/data.py) dosyayı kontrol eder; yaşı, maaşı, cinsiyeti (sadece karşılaştırma için) ve hedefi tutar.
2. **Karşılaştır.** [`adconv/models.py`](adconv/models.py) her adayı aynı `RepeatedStratifiedKFold` bölmelerinde çalıştırır. Ölçekleme pipeline'ın içinde olduğu için sadece eğitim parçalarından öğrenilir; KNN'in k değeri her eğitim parçasının içinde seçilir.
3. **Seç.** En iyi ROC AUC değerine bir standart hata kadar yakın olan en basit model kazanır. ROC AUC eşikten bağımsızdır; eşik kullanıcıya bırakıldığı için bu önemli.
4. **Dışa aktar.** [`adconv/export.py`](adconv/export.py) her modelin olasılığını bir ızgaraya yazar. Random Forest ve SVM bir formüle indirgenemez ama ızgara her modelde çalışır.
5. **Göster.** [`web/src/predict.js`](web/src/predict.js) ızgarayı bilinear interpolasyonla okur; [`web/src/metrics.js`](web/src/metrics.js) karışıklık matrisini ve ROC eğrisini katlama dışı tahminlerden hesaplar, yani sayılar her modelin hiç görmediği kişilerden gelir.

## Sonuçlar

Tekrarlı, sınıf oranını koruyan 10 katlı çapraz doğrulama (50 bölme):

| Model | ROC AUC | F1 | Kesinlik | Duyarlılık | Doğruluk |
|---|---|---|---|---|---|
| Lojistik regresyon | 0,923 ± 0,040 | 0,754 | 0,842 | 0,698 | 0,842 |
| **Lojistik regresyon, 2. derece özellikler**, seçilen | 0,956 ± 0,031 | 0,862 | 0,862 | 0,870 | 0,900 |
| K en yakın komşu (k ayarlı) | 0,956 ± 0,034 | 0,867 | 0,866 | 0,875 | 0,904 |
| SVM, RBF çekirdek | 0,953 ± 0,037 | 0,880 | 0,864 | 0,905 | 0,912 |
| Random Forest | 0,956 ± 0,041 | 0,877 | 0,849 | 0,915 | 0,908 |
| Referans (hep "almaz") | 0,500 | 0,000 | 0,000 | 0,000 | 0,642 |

Cinsiyet eklenince hiçbir modelde ROC AUC 0,002'den fazla değişmiyor.

## Kullanılan Teknolojiler

- Eğitim ve değerlendirme için **Python**, **pandas**, **NumPy**, **scikit-learn**
- Framework'süz ve derleme adımı olmadan **HTML**, **CSS** ve **JavaScript**; harita ve ROC grafikleri elle yazılmış SVG
- **pytest** ve Node'un yerleşik test aracı (`node --test`)
- Barındırma için **Vercel**, sıkı bir İçerik Güvenliği Politikası (CSP) ile

## Kurulum ve Çalıştırma

[conversion.miracdeprem.com](https://conversion.miracdeprem.com) adresini aç ya da Python ve Node.js ile yerelde çalıştır:

```bash
git clone https://github.com/MrcDprm/ad-conversion-prediction.git
cd ad-conversion-prediction
python -m venv .venv
.venv/Scripts/activate          # Windows; macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
```

Eğit, karşılaştır ve dışa aktar (`web/metrics.json`, `web/grid.json` ve `web/data.json` yazılır), sonra ortak test verilerini yenile:

```bash
python -m adconv.train
python -m adconv.fixtures
```

Testleri ve web sitesini çalıştır:

```bash
python -m pytest
npm test
npx serve web                   # sonra yazdığı adresi aç
```

HTML sayfaları, `sitemap.xml` ve `robots.txt` iki dilde `web/pages/` ve `web/src/messages.js` dosyalarından üretilir. Bir metni değiştirince `npm run build:pages` çalıştır; sayfalar güncel değilse bir test başarısız olur.

## Proje Yapısı

```
adconv/        veri doğrulama, model karşılaştırma, dışa aktarma, eğitim komutu, test verileri
tests/         pytest testleri
data/          veri seti
scripts/       build-pages.mjs: Türkçe ve İngilizce sayfaları üretir
web/           web sitesi (Vercel bu klasörü yayınlar)
  pages/       sayfa şablonları
  src/         predict.js, metrics.js, map.js, app.js, model-page.js, messages.js
  tests/       JavaScript testleri ve ortak test verileri
```

## Öğrendiklerim

- Dengesiz veride doğruluk çok şey gizliyor. Burada hiç alıcı bulamayan bir model bile %64 doğru; asıl hikâyeyi ROC AUC, kesinlik ve duyarlılık anlatıyor.
- Eşik seçmek modelin değil, işin kararı. Katlama dışı tahminler sayesinde her eşiğin bedelini, eğitim verisiyle şişirmeden gösterebildim.
- Eğri bir sınır her zaman karmaşık bir model gerektirmiyor. Yaşın ve maaşın karelerini ve çarpımlarını eklemek, düz lojistik regresyonun Random Forest ve SVM'e yetişmesini sağladı.
- Bir hiperparametreyi skorladığın veriyle ayarlamak sonucu şişirir. Eski sürüm bunu KNN için yapıyordu; iç içe çapraz doğrulama bunu çözüyor.
- Elde olan her sütun modele girmemeli. Cinsiyet burada hiçbir şey katmadı, reklam hedeflemede kullanılması da adalet sorusu doğururdu.
- Modelleri olasılık ızgarası olarak dışa aktarmak her sınıflandırıcıyı tarayıcıda kullanılabilir yaptı; JavaScript'i scikit-learn'e karşı test etmek ikisini uyumlu tuttu.
- `ads.` ile başlayan bir alt alan adı reklam engelleyicilere takılıyor, bu yüzden site `conversion.` adresine taşındı: isimlendirmede küçük bir ders.

## Gelecek Planları

- İki sayısal sütun ve evet/hayır hedefi olan kendi CSV dosyanı yükleme.
- Olasılık kalibrasyonu grafiği.
- Ek veri setleri.

## Lisans

[MIT](LICENSE)
