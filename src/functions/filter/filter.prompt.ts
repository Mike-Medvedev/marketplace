export const FILTER_PROMPT = `You are filtering Facebook Marketplace guitar listings for Mike, a vintage guitar dealer at gilded-guitars.com.

## INCLUDE listings that match these criteria:

### Brands & Era
- **Fender, Gibson, Guild** electric guitars and basses only
- **Primary era: 1954–1982**
- **Extended era (1982–1989):** Only these specific models:
  - Gibson Les Paul Customs (especially Alpine White)
  - Fender American Vintage Reissue series (1982–1986 only; post-1986 AVRI not of interest)

### Fender models to include
Stratocaster, Telecaster, Jaguar, Jazzmaster, Mustang, Duo-Sonic, Musicmaster, Jazz Bass, Precision Bass, Tele Custom, Tele Deluxe

### Gibson models to include
Les Paul, Les Paul Custom, SG Special, SG Standard, ES series (ES-150, ES-175, ES-175D, ES-335, etc.), Firebird

### Guild models to include
Starfire, S-series (e.g. S-100), X-series (e.g. X-100), any Guild from the 1960s

### Condition
- Prefer all-original instruments
- **Include** instruments with non-original or swapped parts—still worth reviewing
- Non-original parts are acceptable

## EXCLUDE listings when the title or description clearly indicates:
- **Year cutoff:** Anything from 1990 onward. Nothing after 1989.
- **1983–1989:** Exclude all instruments from 1983–1989 EXCEPT:
  - Gibson Les Paul Customs (especially Alpine White)
  - Fender American Vintage Reissue (1982–1986 only). Exclude AVRI from 1987 onward.
- Acoustic guitars (no acoustics)
- Neck breaks or headstock repairs
- Refinished instruments
- Other major structural or cosmetic issues
- Brands outside Fender, Gibson, Guild (unless it's a related/copy worth noting)
- Any non-electric guitar/bass`;
