// Demo content for trying the tool. Deliberately includes common issues.

import type { AnalysisInput } from '../types/analysis';

export interface Sample {
  id: string;
  label: string;
  input: AnalysisInput;
}

const servicePage = `# Laser Hair Removal in London

In today's fast-paced world, everyone wants smooth, hair-free skin without the hassle. Whether you are tired of shaving or looking for a long-term solution, laser hair removal in London is the perfect choice for you. At our world-class clinic, we are committed to providing the best laser hair removal in London with guaranteed results.

## Why Choose Our Clinic?

Our clinic is the No.1 laser clinic in London. We use the most advanced laser technology available, which is completely safe for all skin types. Furthermore, our experienced team is dedicated to providing a seamless and comfortable experience tailored to your unique needs. Moreover, our state-of-the-art equipment ensures exceptional results every single time.

Our patients love their results. "I had my treatment here and it changed my life, best clinic ever!" - Sarah, 34

## Benefits of Laser Hair Removal

Laser hair removal offers permanent results after just one session. It is painless and has no side effects, so you can return to your daily routine immediately. Additionally, it is a cost-effective solution that saves you time and money in the long run. Studies show that 95% of patients are satisfied with their results.

It is important to note that laser hair removal in London is suitable for both men and women. Not only does it remove unwanted hair, but it also improves the texture of your skin. When it comes to laser hair removal in London, our clinic stands out as the leading choice.

## Special Offer

Limited time offer! Book now and save 50% off your first session. Only 5 slots left this month, so don't miss out!

## Conclusion

In conclusion, laser hair removal in London is a game-changer for anyone looking for smooth skin. With our world-class team and cutting-edge technology, you can rest assured that you are in safe hands. Contact us today to book your consultation.`;

const blogPost = `# How Long Do Dental Implants Last?

Dental implants are titanium posts placed in the jawbone to replace a missing tooth root. With good care, the implant post itself often lasts 20 years or more, while the crown on top usually needs replacing after 10 to 15 years.

I have placed implants for just over 14 years, and the question I hear most at consultations is not "does it hurt?" but "will I have to do this again?". The honest answer is that it depends far more on the patient's habits than on the implant brand.

## What Affects How Long an Implant Lasts?

In our practice, the implants that fail early almost always share one of three factors: smoking, untreated gum disease, or night-time grinding. A 2016 review in the Journal of Dental Research reported 10-year survival rates of roughly 95% for implants in healthy, non-smoking patients, but that figure drops noticeably in smokers.

- Smoking slows healing and reduces blood flow to the gum.
- Gum disease (peri-implantitis) can destroy the bone that holds the implant.
- Grinding puts repeated force on the crown and screw.
- Diabetes that is poorly controlled can affect healing.

## How Can You Make Your Implant Last Longer?

Brush twice a day, clean between the implant and neighbouring teeth with interdental brushes, and keep your hygienist appointments every three to six months. If you grind, wear the night guard we make for you. Patients often skip this, and it is the most common reason we see a cracked crown.

## When Does an Implant Need Replacing?

Warning signs include a crown that feels loose, bleeding around the implant, or a bad taste that doesn't go away. A loose crown is usually a simple fix: the screw can be tightened or the crown remade. Bone loss around the implant is more serious and needs prompt assessment.

## Frequently Asked Questions

### Is the implant or the crown more likely to fail?
The crown. It is exposed to chewing forces and wear, so it typically needs replacing first.

### Do implants last longer than bridges?
Usually, yes. Bridges often last 10 to 15 years, while the implant post can last decades with good care. Every mouth is different, so results vary.

Written by Dr. Priya Shah, BDS, MFDS, GDC No. 123456. Last updated 12 March 2026.`;

export const SAMPLES: Sample[] = [
  {
    id: 'service-derm',
    label: 'Service page: laser hair removal (many issues)',
    input: {
      contentType: 'service',
      industry: 'dermatology',
      primaryKeyword: 'laser hair removal in London',
      secondaryKeywords: ['laser hair removal cost', 'laser hair removal for dark skin'],
      targetLocation: 'London',
      targetAudience: 'adults considering hair removal',
      websiteUrl: 'https://www.example-skin-clinic.co.uk',
      content: servicePage,
    },
  },
  {
    id: 'blog-dental',
    label: 'Blog: dental implants (stronger example)',
    input: {
      contentType: 'blog',
      industry: 'dental',
      primaryKeyword: 'how long do dental implants last',
      secondaryKeywords: ['dental implant lifespan', 'implant failure'],
      targetLocation: '',
      targetAudience: 'patients considering implants',
      websiteUrl: 'https://www.example-dental.co.uk',
      content: blogPost,
    },
  },
];
