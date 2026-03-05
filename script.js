const stCharlesStopsPath = "data/st-charles-timing-stops.geojson";
const stCharlesLinePath = "data/st-charles-line.geojson";
const gardenDistrictBoundaryPath = "data/garden-district-boundary.geojson";
const muralsPath = "data/murals.geojson";
const bundledDataByPath = window.APP_DATA
  ? {
      [stCharlesStopsPath]: window.APP_DATA.st_charles_timing_stops,
      [stCharlesLinePath]: window.APP_DATA.st_charles_line,
      [gardenDistrictBoundaryPath]: window.APP_DATA.garden_district_boundary,
      [muralsPath]: window.APP_DATA.murals
    }
  : {};

const outboundSegmentRanges = [
  [6, 9],
  [6, 8],
  [9, 11],
  [10, 11],
  [6, 6],
  [3, 3]
];

const inboundSegmentRanges = [
  [4, 4],
  [6, 6],
  [10, 11],
  [8, 11],
  [7, 7],
  [6, 8]
];

const serviceFrequencies = [
  {
    title: "Weekdays and weekends",
    body:
      "The current Winter 2026 Route 12 PDF shows one timetable for both weekdays and weekends rather than separate schedules."
  },
  {
    title: "Outbound frequency",
    body:
      "From Canal at Carondelet, service is about every 34 minutes in the early morning, every 15 minutes in the morning peak, every 11 to 15 minutes through most daytime and evening hours, then every 31 to 34 minutes after midnight."
  },
  {
    title: "Inbound frequency",
    body:
      "From S. Carrollton at S. Claiborne, service is about every 34 minutes very early, every 15 minutes in the morning peak, mostly every 15 to 20 minutes through the day and evening, then every 32 to 39 minutes late at night."
  },
  {
    title: "Service span",
    body:
      "Published terminal departures run roughly from 4:18 AM to 3:49 AM outbound and from 3:32 AM to 3:01 AM inbound, based on the current RTA timetable."
  }
];

const route11Magazine = {
  name: "RTA Route 11 - Magazine",
  summary: "Exact GTFS route trace",
  terminals:
    "Exact GTFS terminal stops: Canal and Magazine (the public-facing Canal at Magazine terminal) and Children's Hospital.",
  note:
    "As of March 2, 2026, this map now uses the exact Route 11 GTFS shapes from the current NORTA feed version S1000241, valid September 7, 2025 through September 6, 2026. It draws both one-way directions exactly, including the downtown split and the Jefferson / Tchoupitoulas tail.",
  timingPoints:
    "Published timing points: Canal at Magazine, Magazine at Jackson, Magazine at Napoleon, and Children's Hospital. Inbound trips also show a downtown timing point at Loyola at Common before returning to the Canal terminal.",
  outboundPath:
    "Official outbound streets: Canal, Gravier, Magazine, Thalia, Magazine, Antonine, Magazine, Constantinople, Magazine, Jefferson, then Tchoupitoulas.",
  inboundPath:
    "Official inbound streets: Tchoupitoulas, Laurel, Magazine, Sophie Wright, Camp, Calliope, Camp, Lafayette, Poydras, Elk, then Canal."
};

function decodePolylineCoordinates(encoded, precision = 6) {
  const coordinates = [];
  const factor = 10 ** precision;
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push([longitude / factor, latitude / factor]);
  }

  return coordinates;
}

const route11ShapeEncodings = {
  outbound:
    window.atob(
      [
        "dXJiY3hAcnhneGpEYEFrQmZAZkBuQVJwR3RBckdyQXBHdEFyRmRBcEZmQXJGZEFwRmRBYkRsRGJEakRkQXFGdkhgQnhIYEJ2SGBCdkhgQnZIYEJ2SGBCeEhgQnZIYEJ4RWxEckJ9QnJIeEF0SHhBckh4QXJIeEFkRmJBZkZgQWRGYkFkRmBBZEZgQWRGYkFkRmBBZEZiQWRGYEFmRmBBZEZiQUxoRGREeUJ2RWhBdkVoQXpJakJyQVh8SWJCekliQnxJZEJ6SWJCbklyQ25JcENwSXJDfkVgQmZKVGhGTnZJ",
        "dkJ4SXRCdkl2QnZJdkJ2SXZCdkl2QnhJdEJ0QVxkSmpAZEpoQHJDUHhJbkJ6SWxCeElsQnpJbEJ0QVpwSWxDcElsQ3BJbkNwSWxDUkZkSmZAZEpkQGBEUHhJckJ2SXJCYkJgQH5IYkJyRGZAckluQXpFekBiR3pAeklkQnpGeEByRHpAekloQnpJaEJ6SWZCekloQnpJaEJ0SXxCdEl+QnZJfEJ0SXxCdEl8QmBIakJgQl5mQF9EcEZmQXBGaEFyRmZBcEZmQXBGZkFwRmhBckZmQXBGZkF4SHhBekh4QXhI",
        "eEF6SHhBbEduQWxHbkFjQGpDYkBrQ2pDekB8RXxAfEV+QGJFdkBiRXhAYkV2QGJFeEBiRXZAZEV4QGJFdkBiRXZAYkV4QGJFdkBiRXhAYkV2QGJFdkBiRXhAYkV2QGRFeEBnQHhDfEhvQG5HbEFuR2xBbEdsQW5HbEFuR2xBbkdsQW5HbEFsR2xBbkdsQW5HbEFuR2xBbEdsQW5HbEFuR2xBbkdsQW5HbEF6RmJJfEZgSXxGYkl6RmJJfEZgSXxGYkl6RmBJfEZiSW1AYkV4RnJCaER6RmhEekZoRHxGaER6",
        "RmZEfEZoRHpGaER6RmhEfEZoRHpGZkR8RmhEekZoRHpGaER8RmZEekZoRHxGaER6Rkh8Rj8/ZkRwQ2REckN2RHJHdER0R3ZEckd0RHRHekNsRnxDakZ8Q2xGfERqSHxEakh8RGpIfERqSHJEdkdyRHZHakNkRmpDZEZoRGpIaERqSH1BdEB8QXVAYkJyRG5CZEVuQmRFcEJiRW5CZEVuQmRFbkJkRXBCYkVuQmRFbkJmRW5CZkVwQmZFbkJmRW5CZkVuQmZFcEJmRW5CZkV2QnJEX0RwQn5DcUJgRWxKYkVq",
        "SmBFbEpiRWpKcEVwSnBFcEpwRXBKcEVwSn1BaEF8QWlBdkJyRHRDbEd0Q2xHdENsR3RDbEdqQ3ZHdkJmRXZCZkVkQ3RGZkNyRmRDdEZmQ3JGakVmSmxFZkpqRWZKbEVmSmtCckFqQnNBbkFyRHBCZkVyQmZFcEJmRXJCZkVwQmZFckJmRXBCZkVyQmZFakVsSmxFakpqRWxKbEVqSmlCbkFoQm9BbkF2QmxCekVsQnpFakN+SGpDfkh6QHZCfEFmRX5BZkV8QWZFfkFmRXpAZkV+Q25LfkNuS3pBeEZ6QXhG",
        "fEF4RnpBeEZ6QXhGekF4RnxBeEZ6QXhGbUJwQGxCcUBuQX5DYkJiR2JCdEdiQnRHYkJyR2JCdEdiQnRHYkJ0R2JCckdiQnRHaEF+RmpBfEZoQX5GakF8RntBYEB6QWFAbkFiR35AakZgQWhGfkBqRmBBaEZ+QGpGYEFoRn5AakZgQWhGZEFmRmRBaEZkQWZGZEFmRmRBZkZkQWhGZEFmRmRBZkZSdkJ9QnJAfEJzQHhBdEh4QXRIeEF0SHhBdEh4QWxMeEFsTHhBbEx4QWxMckFsTHRBbExyQWxMdEFsTFJy",
        "RHVCTnRCT1Z4SVh2SVZ4SVh2SVJuR1JwR1JuR1JuR1JuR1JwR1JuR1JuR1JqQ2NEWGJEWVJkR1JmR1JkR1JkR1JkR1JmR1JkR1JkR1JiR0xiRk5iRkxgRk5iRkxiRk5iRkxgRk5iRndBSHZBSVJ6RWZAckQ/ekBSYkxgQHpKYkB6SmBAekpiQHpKXHRLXHJLXHRLXHJLcUVYcUVYcEVZcEVZZkBiTD9iQj9+Q1JuRlJuRlJ4R1J6R1J4R1J4R1J4R1J6R1J4R1J4R1J4RlJ4RlJ4RlJ4RlJ4RlJ4RlJ4RlJ4",
        "RmdCRGZCRVJ6RWZAYkxQZEZOZEZQZEZQZEZQZEZOZEZQZEZQZEZQdkZOdkZQdEZQdkZQdkZOdkZQdEZQdkZfQkJ+QUNSakhWckdYcEdWckdYcEdWckdYcEdWckdYcEdWZElYYklWZElYYkl3QkR2QkVSYkdLcEdNckdLcEdLckdLcEdNckdLcEdLckdJeEtJeEtJeEtJeEtrQkBqQkFTdkdHbkZHbkZFbkZHbkZHbkZHbkZFbkZHbkZLbkdNbkdLcEdLbkdLbkdNbkdLcEdLbkdLYEZJfkVLYEZJYEZ5QX5E",
        "ZEFwRWVAeEVlQHpFZUB6RWdAeEVlQHpFZUB6RWVAeEVlQHpFa0N6QGBCaER1QGpJc0BoSXNAakl1QGpJc0BoSXVAaklzQGpJdUBoSWJFdkBiRXhAYkd+QGRHfkBiR35AZEd+QGJHfkBkR35AYkd+QGRHfkBiR35AZEd+QGRHfkBiR35AZEd+QGJHfkBkR35AYkd+QHZBcERSZUN+Q2ZAeEV4QHZFeEB4RXZAeEV4QHhFeEB2RXhAeEV2QHhFeEBwRXpAcEV6QHRIbkF0SG5BYkdkQWJHZEFqQ1JsR3pAbEd6",
        "QEhgSEhgSD96RT92Rz92R1JySUh2R0h2Rz9uRj9qQz96Sj9qQz9yRD9uRlJ6RT9iR2NDTWxDfEFhQGBJY0BgSWdAfkVnQHxFZ0B8RWdAfEVnQH5FZ0B8RW9BcktvQXRLb0FyS29BdEtjQ11iQ1x7QH5Ic0BmRnVAZkZzQGhGc0BmRnNAZkZ1QGZGc0BoRnNAZkZpQHpFa0B6RWlAekVpQHpFaUB6RWtAekVpQHpFaUB6RW9BfkdvQXxHb0F+R29BfkdvQX5Hb0F8R2tBdEZtQXJGZ0JqQGxAbkRpQHBDcEZ4",
        "QXBGekFyRnpBcEZ6QXBGeEFwRnpBcEZ6QXBGekFyRnhBcEZ6QXBGekFwRnpBcEZ6QXJGeEFwRnpBcEZ6QXtAeEV7QHpFe0B6RXtAeEV7QHpFe0B6RX1AeEV7QHpFe0B4RXtAekV7QHpFe0B4RXtAekV7QHpFe0B4RXtAekV7QHpFe0B4RXtAekV7QHhFe0B6RXtAekV7QHhFfUB6RXtAekV7QHhFe0B6RXtAeEV7QHpFe0B6RXtAeEV7QHpFQ2NE"
      ].join("")
    ),
  inbound:
    window.atob(
      "Z3Z9YHhAamZ9e2pEakBWZ0BqQ19JX0RrQ29Bc0lfRHNJX0RzSV9Ec0lfRGtDe0B7RndCfUZ3QntGd0J7RndCe0Z3Qn1Gd0J7RndCe0Z3QmNHa0NwQmdIckJlSHBCZ0hyQmVIcEJnSHJCZUhwQmdIckJlSGxCd0dsQndHZkJ9R2hCe0dmQn1HaEJ7R2ZCc0loQnNJZkJzSWhCc0l2QntKdkJ7SmJCckBjQnNAekBjR3pBYUl6QWNJfEFhSXpBYUl6QWFJekFjSXxBYUl6QWFJaEB7RWhAe0VqQHtFaEB7RWhAe0VoQHtFakB7RWhAe0VyQXFKdEFxSnJBcUp0QXFKZEFeZUFfQG5Be0puQHFGbEBzRm5AcUZuQHFGbkBxRmxAc0ZuQHFGbkBxRn5AbUpgQWtKdEBrSXJAaUlsRF9AfURjQHpAX0lIbUdIbUdTe0U/b0Y/c0Q/a0M/e0o/a0M/b0ZJd0dJd0dTc0k/d0c/d0c/e0VJYUhJYUhtR3tAbUd7QGtDU2NHZUFjR2VBdUhvQXVIb0FxRXtAcUV7QG9FdUBvRXdAbUV1QG9Fd0BvRXVAb0V3QG1FdUBvRXdAWGVDaUZ2QGVHYUFnR2NBZUdjQWVHYUFlR2NBZUdjQWdHY0FlR2FBZUdjQWVHY0FnR2FBZUdjQWVHY0FlR2NBZUdhQWdHY0F1Rl9EdUZhRGhAe0ZoQHlGZkB7RmhAe0ZoQHtGaEB7RmhAeUZoQHtGZkB7RmhAe0ZoQHtGaEB5RmhAe0ZmQHtGaEB7RmhAeUZ8Q31Db0JfRlBlRk5lRk5lRk5lRk5nRlBlRk5lRk5lRkxvR0pvR0pvR0pxR0xvR0pvR0x3TE53TEx3TE53TGpDSGtDST9fREZvRkRvRkZvRkZvRkZvRkRvRkZvRkZvRkhvRkhvRkhvRkhvRkhvRkhvRkhvRkhvRmRDTGVDTVJ3R11lS11lS11lS11lS1VzRld1RlVzRlV1RlVzRld1RlVzRlV1RmpDUWtDUFNvRlN7R1N9R1N7R1N9R1N7R1N9R1N7R1N9R1FlRlFlRk9lRlFlRlFlRlFlRk9lRlFlRlNnRWpDRWtDRFN7RVV1R1dzR1V1R1V1R1V1R1dzR1V1R1V1R1NjR1NjR1NjR1NjR1NjR1NjR1NjR1NjR35EW19FWj9zRFNvRlNvRj9fRD9jQlN9RlNfR1N9RlNfR1N9RlNfR1N9RlNfR2NAe0phQHtKY0B7SmFAe0pTY0xwQlVxQlQ/e0BnQHNEUX1GUV9HT31GUV9HUX1GUV9HT31GUV9HU2NHU2NHU2NHU2NHU2NHU2NHU2NHU2NHU2NHakJRa0JQU19EU29HU29HU3FHU29HU29HU29HU3FHU29HWWFKV2NKWWFKV2NKckJHc0JGU2tDdUFtTHNBbUx1QW1Mc0FtTHlBbUx5QW1MeUFtTHlBbUx1QXVIc0F1SHVBdUhzQXVIaEJfQGlCXmdAd0JlQWdGZUFnRmVBaUZlQWdGZUFnRmVBZ0ZlQWlGZUFnRnNCfUtxQl9Mc0J9S3FCX0xyQ3dAc0N2QHtAe0VfQl9JfUFfSV9CX0l9QV9Je0FhR31BX0d7QWFHe0FhR3tBYUd9QV9He0FhR3tBYUd0QnlAdUJ4QHtAX0RjQmNHZUJtR2dCbUdlQm1HZUJtR2VCbUdnQm1HZUJtR2VCbUdfRG9LX0RvS3tAZ0VfQmdFfUFnRV9CZ0V9QWdFe0B3Qm1CeUZtQnlGekJvQXtCbkF7QGtDbUJ7RW1Ce0VvQmVFcUJjRW9CZUVvQmVFb0JlRXFCY0VvQmVFb0JlRWdFYUpnRWNKZ0VhSmdFY0p4QWtBeUFqQXdCc0RvQmlFcUJpRW9Ca0VvQmlFb0JpRXFCaUVvQmtFb0JpRWdDc0ZlQ3VGZ0NzRmVDdUZ3QmdFd0JnRWtDd0dhQ2lGYUNrRmFDaUZhQ2tGbEJxQW1CcEFvQWtDd0JvRXdCbUV3Qm9Fd0JvRXdCb0V3Qm1Fd0JvRXdCb0VjRWtKYUVtSmNFa0phRW1KaEF1QGlBdEB3QnNEb0JnRXFCZ0VvQmdFb0JnRW9CZ0VxQmdFb0JnRW9CZ0VxRWtKcUVtSnFFa0pxRW1KYkN1QWNDdEF7QHdCbUJhRW1CY0VtQmFFbUJjRWtDZUZrQ2VGc0R3R3NEd0d9RGtIfURrSH1Ea0h9RGtId0JzRHdCc0R3QnNEd0JzRHdCc0R3QnNEd0JzRHdCc0RwRG9DcURuQ3VDZUZ1Q2VGY0JfRF9Eb0ZfRG9GfURhSH1EYUhhQ2tFYUNtRWFDa0VhQ21FdUNlRnVDZUZ1Q2VGdUNlRnVDZUZ1Q2VGdUNlRnVDZUZfRG9GYkJhQmNCYEJjQmtDd0dxQHdHcUBzRFN3R29BZ0VnQGFGe0BfRntAYUZ7QF9Ge0BzRGdAYUhlQWFIZUFrSG9Ba0hvQXNJeUFzSXlBUHlAUXhAZ0VnQHtAU19JY0JTP3NJY0JzSWNCY0ZjQWNGYUFhRmNBY0ZjQWNGY0FjRmFBYUZjQWNGY0FKe0FLekFzRHtAa0hvQXVGaUFzRmtBdUZpQXNGa0FzSXdCY0d7QGNCZ0B7QGdAb0FTc0ljQnNJY0JzSWNCZ0V7QGdFe0BYc0JZckJrQ2dAb0FTZ0VvQXdHe0B9RHtAfUR7QHtAU3VGaUFzRmtBdUZpQXNGa0FjQlNzRX1AdUV9QHNFX0FzRX1Ac0V9QHVFfUBzRV9Bc0V9QGBAc0JhQHJCc0R7QHFFeUBxRXdAcUV5QHFFeUBxRXlAcUV3QHFFeUBxRXlAZUZlQWVGZUF1SHlBdUh5QXVIeUF1SHlBe0BpQ29EdEF9SHNBfUh1QXtIdUF9SHNBe0h1QX1Ic0F9SHVBe0h1QUN3S2dDakpjR2VDZUhvQWNIbUFnRXVAZ0V3QG9BU2VGZUFlRmVBdUZlQXNGZUF1RmVBc0ZlQXtFd0JtR29BbUdvQWdFe0BnRXtAd0JTY0dvQV9Ee0BnRWdAYkBnQ2NAZkN7RXtAc0R7QGtIeUFrSHlBaUV9QGtFfUBpRV9BaUV9QGlFfUBrRX1AaUVfQWlFfUB7RXtAd0dvQWRBY0FlQWJBX0R7QGdFZ0B5RmlBeUZrQXlGaUF5RmtBZ0V7QGdFe0BrRl9BaUZhQWtGX0FpRmFBc0R7QFhlQllkQl9EZ0B7RXtAa0h5QWtIeUF7RXtAY0JTbUV7QGtFe0BtRXtAa0V7QEF3Q0B2Q19EZ0B3QmdAfUR7QH1Ee0BzSWNCZ0VvQXdHb0F3R29Bc0l3QmdFZ0BnSndCZUFiSWVBZEllQWJJZUFkSWdAekVnQHpFeUFwSnlBcEpnQGJHd0B4RnVAeEZ3QHhGdUB4RmVBckllQXJJY0J6Sm9DdURuQ3REU2JCU3pAb0FuS2dAZkVrQW5JX0F0R19BdkdhQXpHY0F6R3tFZkNGaklIaElvQXpKb0FyS29BdEtvQXJLb0F0S3FAfkVxQGBGcUB+RXFAYEY/ZkBxQG5GcUBuRmVBbkVjQWxFZUFuRWVBbEVlRlJaa0JnSmtDe0B+SGdFZ0B7QD9nQD97QFJnQGZAU3pAU3JEb0E/Z0VSd0dSd0I/c0RSa0M/Y0JTb0E/b0E/Y0JTX0lnQHdHb0F7RWdAUj99SWNCfUljQntFb0F7RXtAa0h5QWtIeUFvRm9BX0RnQGNCZ0BhSG9BYUhvQWtIY0JvRm9Bc0R7QF9Eb0F7QGdAd0J7QGNHc0R3QndCX0RnRWNCb0F3QndCX0RrQ19Ea0NnRXNEckF3QnNBdkJ1Q3VDdUN1Q3dHb0ZrSG1Ha0htR2tIbUdrSG1HZUB3Q31AZkF3QmNCckRjR25Gc0luRnNJZkVzSXpCeUR8QndEekJ5RHxCd0RwQnNEckJzRHBCc0RyQnNEckRvRmBDaURgQ2lEbkFrQ3ZCX0RmRWdIZkVlSGZFZ0hmRWVIYkJfRHZCdUR2QndEdkJ1RHZCdUR2QnVEdkJ3RHZCdUR2QnVEdEJkQnVCZUJqQ2dFakNzRG5GeUluRndJbkZ5SW5Gd0l2QmdFckRjR2ZFa0hmRWtIfER3R3xEd0dmRV9JYEN9RGBDfURmQHtAckRjR3pAe0B2QmdFfkNvRn5Db0ZmRWtIbkFrQ2xEX0A="
    )
};

const route11GuideGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "RTA Route 11 - Magazine",
        direction: "Outbound"
      },
      geometry: {
        type: "LineString",
        coordinates: decodePolylineCoordinates(route11ShapeEncodings.outbound)
      }
    },
    {
      type: "Feature",
      properties: {
        name: "RTA Route 11 - Magazine",
        direction: "Inbound"
      },
      geometry: {
        type: "LineString",
        coordinates: decodePolylineCoordinates(route11ShapeEncodings.inbound)
      }
    }
  ]
};

const placeCategoryStyles = {
  "public-art": {
    label: "Public art",
    color: "#e65a3a"
  },
  gallery: {
    label: "Gallery",
    color: "#5a54d6"
  },
  "maker-shop": {
    label: "Local maker shop",
    color: "#1d8a78"
  },
  "coffee-bakery": {
    label: "Coffee / bakery",
    color: "#d18a1f"
  },
  restaurant: {
    label: "Restaurant",
    color: "#cf3f6b"
  },
  landmark: {
    label: "Landmark",
    color: "#7a58a6"
  },
  historic: {
    label: "Historic site",
    color: "#7a5a44"
  },
  transit: {
    label: "Transit",
    color: "#1f6fe5"
  },
  park: {
    label: "Park",
    color: "#2f9f57"
  },
  default: {
    label: "Featured stop",
    color: "#565c67"
  }
};

const walkingRoutes = [];

const featuredPlaces = [
  {
    name: "Blazin' Hot Chicken",
    category: "restaurant",
    subtitle: "Featured place",
    description:
      "2323 Canal St, New Orleans, LA 70119. The marker is aligned to the 2323 Canal parcel between Canal, North Tonti, North Miro, and Iberville.",
    coordinates: [29.96345, -90.08318],
    sourceUrl: "https://blazinhotchicken.com/locations/"
  },
  {
    name: "Lafayette Cemetery No. 1",
    category: "historic",
    subtitle: "Historic cemetery",
    description:
      "1400 Washington Ave, New Orleans, LA 70130. The marker is centered on the cemetery block bounded by Washington, Sixth, Prytania, and Coliseum.",
    coordinates: [29.928802, -90.085386],
    status:
      "As of March 2, 2026, it remains closed to the general public until further notice while repairs continue.",
    accessNote:
      "Only permitted workers and families burying loved ones or visiting and tending graves are allowed inside with prior approval.",
    hoursNote:
      "Monday through Friday, 7 AM to 3 PM for access and reopening questions.",
    contact: "City Cemetery Division office: 504-658-3781.",
    sourceLabel: "Closure details",
    sourceUrl: "https://www.lafayettecemeteryno1.org/faqs-about-cemetery-closure.html"
  },
  {
    name: "St. Charles Avenue Mansions",
    category: "landmark",
    subtitle: "Architecture highlight",
    description:
      "Representative Garden District marker for the classic St. Charles mansion corridor near the Washington/Jackson section.",
    coordinates: [29.93096, -90.08527],
    accessNote:
      "Use this as a base pin for the grand estates and architectural facades along St. Charles Avenue in the Garden District.",
    sourceLabel: "St. Charles corridor reference",
    sourceUrl: "https://www.nola.com/entertainment_life/home_garden/new-orleans-100-historic-homes-st-charles-avenue/article_4d4f0f7c-1478-11eb-ba8f-cf59845804f8.html"
  },
  {
    name: "Commander's Palace Area",
    category: "landmark",
    subtitle: "Garden District highlight",
    description:
      "1403 Washington Ave, New Orleans, LA 70130. This pin marks the Commander's Palace corner and surrounding Garden District residential blocks.",
    coordinates: [29.928834, -90.084213],
    accessNote:
      "Great base point for nearby homes, gardens, and photo stops around Washington, Prytania, and Coliseum.",
    sourceLabel: "Commander's Palace location",
    sourceUrl: "https://www.commanderspalace.com/"
  },
  {
    name: "Joseph Clark House",
    category: "historic",
    subtitle: "Potential stop",
    description:
      "2531 Gov Nicholls St, New Orleans, LA 70119. Added from your shared stop list as the Clark House associated with St. Luke's.",
    coordinates: [29.96921, -90.08241],
    accessNote:
      "This stop name appears in multiple places online; this marker uses the documented Clark House address at St. Luke's campus.",
    sourceLabel: "Clark House address reference",
    sourceUrl: "https://www.zillow.com/homedetails/2531-Gov-Nicholls-St-New-Orleans-LA-70119/2095275129_zpid/"
  },
  {
    name: "Pitot House",
    category: "historic",
    subtitle: "Historic house museum",
    description:
      "1440 Moss St, New Orleans, LA 70119. Creole colonial-era house museum on Bayou St. John.",
    coordinates: [29.981667, -90.088056],
    accessNote:
      "A strong history stop if you are extending beyond the Garden District into Bayou St. John / City Park side.",
    sourceLabel: "Pitot House address",
    sourceUrl: "https://savingplaces.org/places/pitot-house"
  },
  {
    name: "Gallier House (Exterior)",
    category: "historic",
    subtitle: "French Quarter historic home",
    description:
      "1132 Royal St, New Orleans, LA 70116. Marker uses Library of Congress coordinate data for Gallier House.",
    coordinates: [29.961716, -90.061318],
    accessNote:
      "Best used as a French Quarter architecture stop focused on exterior and period details.",
    sourceLabel: "Library of Congress record",
    sourceUrl: "https://www.loc.gov/item/la0286/"
  },
  {
    name: "Private Manicured Gardens Area",
    category: "landmark",
    subtitle: "Garden District highlight",
    description:
      "Representative marker for interior Garden District blocks known for private landscaped gardens and courtyard-heavy homes.",
    coordinates: [29.92946, -90.08238],
    accessNote:
      "This is a neighborhood highlight marker rather than a single public venue.",
    sourceLabel: "Garden District walking context",
    sourceUrl: "https://freetoursbyfoot.com/garden-district-walking-tour/"
  },
  {
    name: "Magazine at Natatorium",
    category: "transit",
    subtitle: "Transit connection",
    description:
      "Exact GTFS stop point for Magazine at Natatorium on the south edge of Audubon Park.",
    coordinates: [29.92555, -90.12947],
    status:
      "Catch RTA Route 31 (Leonidas/Gentilly) or Route 32 (Leonidas/Treme) here to head back along Magazine Street.",
    accessNote:
      "This marker is pinned to the actual GTFS stop coordinate. This is the park-edge Route 31 / 32 stop, not the Route 11 pickup.",
    sourceLabel: "RTA Route 31/32 guide",
    sourceUrl: "https://www.norta.com/RTA/media/RTABusPDFSchedules/route_31.pdf"
  },
  {
    name: "Route 11 at Tchoupitoulas & State",
    category: "transit",
    subtitle: "Exact inbound pickup",
    description:
      "Exact GTFS stop point for the inbound Route 11 stop Tchoupitoulas St. at State St., the closest current Route 11 pickup to the Audubon Park marker.",
    coordinates: [29.91749, -90.123476],
    status:
      "Board here for the inbound Route 11 trip back toward the Magazine corridor, the Warehouse District, and Canal Street.",
    accessNote:
      "This pin uses the actual GTFS stop coordinate for Tchoupitoulas St. at State St. The outbound stop across the street is Tchoupitoulas at State at 29.917509, -90.123159.",
    sourceLabel: "Current Route 11 timetable",
    sourceUrl: "https://www.norta.com/RTA/media/RTABusPDFSchedules/route_11.pdf",
    secondarySourceLabel: "Route 11 path reference",
    secondarySourceUrl: "https://busmaps.com/en/united-states/new-orleans/rta-100412/line-11/2821996568"
  },
  {
    name: "Audubon Park",
    category: "park",
    subtitle: "Walking option",
    description:
      "Marker centered in the interior of Audubon Park near the lagoon and core walking area so the walk shows as a place instead of a fixed overlay.",
    coordinates: [29.930339, -90.126661],
    status:
      "This is a good base for the park's easy, flat walking route: the main paved loop is about 1.8 miles and works well as a relaxed 35 to 50 minute stroll.",
    accessNote:
      "The best version is to wander the oak-lined loop around the lagoons, then head south to the exact Magazine at Natatorium stop if you want Routes 31 or 32, or walk about 0.9 mile southeast to the exact Route 11 stop at Tchoupitoulas and State.",
    sourceLabel: "Audubon Park details",
    sourceUrl: "https://audubonnatureinstitute.org/audubon-park"
  },
  {
    name: "Jackson Square",
    category: "landmark",
    subtitle: "French Quarter highlight",
    description:
      "Marker centered on Jackson Square itself, the historic plaza bounded by Decatur, St. Peter, St. Ann, and Chartres.",
    coordinates: [29.9575, -90.063],
    accessNote:
      "Highlights include the open-air artist colony selling original local artwork along the iron fence, the St. Louis Cathedral facing the square, the Cabildo and Presbytere museum buildings, and regular street performers nearby.",
    hoursLabel: "Artist vendor hours",
    hoursNote:
      "Permitted artist vendors may set up daily from 5 AM to 8 PM, 7 days a week. Artists can show up any day of the week, but you will usually see more of them on weekends and in the evenings.",
    sourceLabel: "City artist permit guide",
    sourceUrl: "https://nola.gov/nola/media/Office-Of-Cultural-Economy/Documents/Artist-Permit-Guide.pdf",
    secondarySourceLabel: "Jackson Square visitor guide",
    secondarySourceUrl: "https://www.experienceneworleans.com/jackson-square.html"
  },
  {
    name: "The Historic New Orleans Collection",
    category: "landmark",
    subtitle: "French Quarter museum and archive",
    description:
      "520 Royal St, New Orleans, LA 70130. This marker is centered on the museum block on Royal between Toulouse and St. Louis.",
    coordinates: [29.95712, -90.06592],
    accessNote:
      "A strong French Quarter stop for New Orleans history, exhibitions, and archival material in the Royal Street museum campus.",
    sourceLabel: "THNOC campus info",
    sourceUrl: "https://www.hnoc.org/visit/our-campus"
  },
  {
    name: "Ogden Museum of Southern Art",
    category: "landmark",
    subtitle: "Warehouse District art museum",
    description:
      "925 Camp St, New Orleans, LA 70130. This marker is placed in the Warehouse Arts District on the museum's Camp Street block near the Contemporary Arts Center and the National WWII Museum.",
    coordinates: [29.94295, -90.07105],
    accessNote:
      "A major Southern art museum with rotating exhibitions, a strong permanent collection, and regular public programs in the downtown arts district.",
    sourceLabel: "Ogden Museum visit info",
    sourceUrl: "https://ogdenmuseum.org/visit/hours/"
  },
  {
    name: "City Park",
    category: "park",
    subtitle: "Major park destination",
    description:
      "Marker centered near the Great Lawn / museum side of City Park, which works as a practical anchor for the park's main visitor attractions.",
    coordinates: [29.9862, -90.0989],
    accessNote:
      "Other highlights here include the New Orleans Museum of Art, the Besthoff Sculpture Garden, Big Lake, the Botanical Garden, and family attractions like Storyland and Carousel Gardens.",
    hoursLabel: "Arts Market New Orleans",
    hoursNote:
      "A big, juried market featuring Gulf South artists (great for ceramics, prints, and jewelry). It runs as a recurring event series in City Park."
  },
  {
    name: "Casamento's Restaurant",
    category: "restaurant",
    subtitle: "Historic oyster bar",
    description:
      "4330 Magazine St, New Orleans, LA 70115. The marker uses the current address-level map coordinate for Casamento's on Magazine Street.",
    coordinates: [29.92059, -90.10105],
    accessNote:
      "Casamento's is one of the city's classic oyster spots, known for raw oysters, fried oysters, charbroiled oysters, oyster stew, and its signature oyster loaf.",
    sourceLabel: "Casamento's official site",
    sourceUrl: "https://casamentosrestaurant.com/",
    secondarySourceLabel: "Address map reference",
    secondarySourceUrl: "https://www.mapquest.com/us/louisiana/new-orleans/70115-2737/4330-magazine-st-29.92059%2C-90.10105"
  },
  {
    name: "La Petite Grocery",
    category: "restaurant",
    subtitle: "Magazine Street restaurant",
    description:
      "4238 Magazine St, New Orleans, LA 70115. This pin is placed on the current Magazine Street dining corridor near the restaurant's 4200 block address.",
    coordinates: [29.92086, -90.10137],
    accessNote:
      "A longstanding Magazine Street dining stop in the same cluster as Shaya and Casamento's.",
    sourceLabel: "La Petite Grocery",
    sourceUrl: "https://www.lapetitegrocery.com/contact"
  },
  {
    name: "Shaya",
    category: "restaurant",
    subtitle: "Magazine Street restaurant",
    description:
      "4213 Magazine St, New Orleans, LA 70115. This marker is placed in the current 4200 block cluster on Magazine Street.",
    coordinates: [29.92097, -90.09912],
    accessNote:
      "Shaya sits in the same stretch of Magazine Street as La Petite Grocery and Casamento's.",
    sourceLabel: "Shaya",
    sourceUrl: "https://www.shayarestaurant.com/contact-shaya"
  },
  {
    name: "Zele",
    category: "maker-shop",
    subtitle: "Local maker market",
    description:
      "2841 Magazine St, New Orleans, LA 70115. This marker sits on the current 2800 block of Magazine Street.",
    coordinates: [29.92386, -90.08695],
    accessNote:
      "An indoor market of local artists and makers, good for ceramics, prints, jewelry, gifts, and easy browseable finds.",
    sourceLabel: "Zele",
    sourceUrl: "https://www.zelenola.com/"
  },
  {
    name: "Octavia Art Gallery",
    category: "gallery",
    subtitle: "Contemporary gallery",
    description:
      "700 Magazine St, New Orleans, LA 70130. This marker is placed on the downtown Magazine gallery stretch near Julia Street.",
    coordinates: [29.94395, -90.06985],
    accessNote:
      "A polished contemporary gallery and a strong downtown-end Magazine art stop.",
    sourceLabel: "Octavia Art Gallery",
    sourceUrl: "https://www.octaviaartgallery.com/contact"
  },
  {
    name: "Casey Langteau Art",
    category: "gallery",
    subtitle: "Uptown gallery",
    description:
      "3649 Magazine St, New Orleans, LA 70115. This marker is placed in the central 3600 block art-and-coffee cluster on Magazine Street.",
    coordinates: [29.92129, -90.09454],
    accessNote:
      "Bright, approachable fine art with giftable prints in a very pop-in-friendly format.",
    sourceLabel: "Casey Langteau Art",
    sourceUrl: "https://caseylangteauart.com/pages/contact"
  },
  {
    name: "Home Malone",
    category: "maker-shop",
    subtitle: "Local gifts and art",
    description:
      "4610 Magazine St, New Orleans, LA 70115. This marker shares the same 4600 block as other Uptown Magazine stops and is offset slightly to keep the pin readable.",
    coordinates: [29.92136, -90.11874],
    accessNote:
      "A favorite for locally made art and gifts, with a stated focus on work made in the Deep South.",
    sourceLabel: "Home Malone",
    sourceUrl: "https://homemalonenola.com/pages/store-locations"
  },
  {
    name: "The Good Shop",
    category: "maker-shop",
    subtitle: "Local maker detour",
    description:
      "1114 Josephine St, New Orleans, LA 70130. This pin marks the short detour just off Magazine in the Lower Garden District.",
    coordinates: [29.93655, -90.07295],
    accessNote:
      "A small collective focused on ethical gifts and local makers, easy to add if you are already in the Lower Garden stretch.",
    sourceLabel: "The Good Shop",
    sourceUrl: "https://www.goodsthatmatter.com/pages/contact-us"
  },
  {
    name: "NOLA Boards",
    category: "maker-shop",
    subtitle: "Local design shop",
    description:
      "3316 Magazine St, New Orleans, LA 70115. This marker is placed on the current 3300 block of Magazine Street.",
    coordinates: [29.92218, -90.09218],
    accessNote:
      "A local-design stop for serving boards, host gifts, and other made-here pieces.",
    sourceLabel: "NOLA Boards",
    sourceUrl: "https://nolaboards.com/"
  },
  {
    name: "Cocoally / Gallery Burguieres",
    category: "gallery",
    subtitle: "Art and merch stop",
    description:
      "2041 Magazine St, New Orleans, LA 70130. This marker is placed on the current 2000 block of Magazine Street.",
    coordinates: [29.93035, -90.07805],
    accessNote:
      "An art-plus-merch stop with a colorful, easy pop-in feel.",
    sourceLabel: "Gallery Burguieres",
    sourceUrl: "https://www.galleryburguieres.com/"
  },
  {
    name: "Great American Alligator Museum",
    category: "landmark",
    subtitle: "Magazine museum stop",
    description:
      "2051 Magazine St, New Orleans, LA 70130. This marker is placed on the 2050 block of Magazine Street just beside the nearby gallery cluster.",
    coordinates: [29.93024, -90.07792],
    accessNote:
      "A quirky Lower Garden District stop focused on alligator history, culture, and themed exhibits.",
    sourceLabel: "Address provided",
    sourceUrl: "https://maps.google.com/?q=2051+Magazine+St,+New+Orleans,+LA+70130"
  },
  {
    name: "CR Coffee Shop",
    category: "coffee-bakery",
    subtitle: "Coffee stop",
    description:
      "3618 Magazine St, New Orleans, LA 70115. This marker is placed in the central Magazine coffee cluster.",
    coordinates: [29.92134, -90.09488],
    accessNote:
      "A neighborhood-style coffee stop that fits well into a casual Magazine crawl.",
    sourceLabel: "CR Coffee Shop",
    sourceUrl: "https://crcoffeenola.com/"
  },
  {
    name: "Current Crop Roasting Shop",
    category: "coffee-bakery",
    subtitle: "Specialty coffee roaster",
    description:
      "3931 Magazine St, New Orleans, LA 70115. This marker is placed on the current 3900 block of Magazine Street.",
    coordinates: [29.92105, -90.09772],
    accessNote:
      "A strong specialty-coffee stop if coffee quality is the main priority.",
    sourceLabel: "Current Crop Roasting Shop",
    sourceUrl: "https://currentcroproasting.com/pages/contact-us"
  },
  {
    name: "Undergrowth Coffee",
    category: "coffee-bakery",
    subtitle: "Coffee stop",
    description:
      "4332 Magazine St, New Orleans, LA 70115. This marker sits in the 4300 block Magazine dining and coffee cluster.",
    coordinates: [29.92066, -90.10124],
    status:
      "Recent local reporting in February 2026 says this shop has closed, so treat this as a recent former stop unless you confirm it has reopened.",
    accessNote:
      "It was a strong linger-friendly coffee option on the same stretch as several destination restaurants.",
    sourceLabel: "Undergrowth Coffee",
    sourceUrl: "https://www.undergrowthcoffee.com/",
    secondarySourceLabel: "Recent closure report",
    secondarySourceUrl: "https://hoodline.com/2026/02/new-orleans-uptown-loses-its-beloved-undergrowth-coffee-as-owners-abruptly-call-it-quits-after-five-years/"
  },
  {
    name: "The Vintage",
    category: "coffee-bakery",
    subtitle: "Coffee and beignets",
    description:
      "3121 Magazine St, New Orleans, LA 70115. This marker is placed on the current 3100 block of Magazine Street.",
    coordinates: [29.92266, -90.09034],
    accessNote:
      "Coffee plus beignets, with an easy crossover from coffee stop into snacks or drinks.",
    sourceLabel: "The Vintage",
    sourceUrl: "https://www.thevintagenola.com/"
  },
  {
    name: "Sucre",
    category: "coffee-bakery",
    subtitle: "Dessert boutique",
    description:
      "3025 Magazine St, New Orleans, LA 70115. This marker is placed on the current 3000 block of Magazine Street.",
    coordinates: [29.92305, -90.08902],
    accessNote:
      "Macarons and dessert-boutique energy in the Magazine dining corridor.",
    sourceLabel: "Sucre",
    sourceUrl: "https://shopsucre.com/pages/locations"
  },
  {
    name: "Surrey's Cafe & Juice Bar",
    category: "coffee-bakery",
    subtitle: "Brunch and juice stop",
    description:
      "1418 Magazine St, New Orleans, LA 70130. Long-running Magazine breakfast and juice bar in the Lower Garden District.",
    coordinates: [29.935778, -90.0719315],
    accessNote:
      "Good pick for breakfast, brunch, or juice stop before or after the Garden District core blocks.",
    sourceLabel: "Surrey's listing",
    sourceUrl: "https://www.mapquest.com/us/louisiana/surreys-juice-bar-8510753"
  },
  {
    name: "District Donuts Sliders Brew",
    category: "coffee-bakery",
    subtitle: "Brunch and donuts",
    description:
      "2209 Magazine St, New Orleans, LA 70130. Added from your list (spelled \"Distict\" there) using the Magazine flagship location.",
    coordinates: [29.9294981, -90.0771649],
    accessNote:
      "Popular all-day stop for donuts, breakfast sandwiches, and coffee in the Lower Garden District segment of Magazine.",
    sourceLabel: "District Magazine location",
    sourceUrl: "https://www.districtdonuts.com/location/magazine/",
    secondarySourceLabel: "Coordinate reference",
    secondarySourceUrl: "https://www.latlong.net/poi/district-donuts-sliders-brew-104847"
  },
  {
    name: "La Boulangerie",
    category: "coffee-bakery",
    subtitle: "Bakery and cafe",
    description:
      "4600 Magazine St, New Orleans, LA 70115. Uptown bakery and pastry stop on the Magazine corridor.",
    coordinates: [29.9204677, -90.1039516],
    accessNote:
      "Reliable pastry, bread, and casual lunch stop in the upper Magazine section.",
    sourceLabel: "La Boulangerie address",
    sourceUrl: "https://laboulangerienola.com/",
    secondarySourceLabel: "Coordinate reference",
    secondarySourceUrl: "https://www.latlong.net/poi/la-boulangerie-104975"
  }
];

const map = L.map("map", {
  scrollWheelZoom: false
}).setView([29.9385, -90.101], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
const featuredPlaceLayer = L.layerGroup().addTo(map);
const muralLayer = L.layerGroup().addTo(map);
const markerFilterSelect = document.getElementById("marker-filter");
const stopList = document.getElementById("stop-list");
const routeList = document.getElementById("route-list");
const frequencyList = document.getElementById("frequency-list");
const outboundMatrix = document.getElementById("outbound-matrix");
const inboundMatrix = document.getElementById("inbound-matrix");
const markersByStop = new Map();
const stopMarkers = [];
const featuredPlaceMarkers = [];
const muralMarkers = [];
const routeLayersByName = new Map();
const routePopupAnchorsByName = new Map();

let activeWalkingRoute = null;
let routeLine = null;
let gardenDistrictLayer = null;
let route11GuideLayer = null;
let loadedStops = [];

function buildStopPopup(stop) {
  return `
    <div class="map-popup">
      <h3>${stop.name}</h3>
      <p><strong>${stop.subtitle}</strong></p>
      <p>${stop.description}</p>
      <p><strong>GTFS stop code:</strong> ${stop.stop_code}</p>
    </div>
  `;
}

function buildRoutePopup(route) {
  const details = [
    route.duration ? `<p><strong>Time:</strong> ${route.duration}</p>` : "",
    route.distance ? `<p><strong>Walking:</strong> ${route.distance}</p>` : "",
    route.streetcarStops ? `<p><strong>Streetcar stops:</strong> ${route.streetcarStops}</p>` : "",
    route.note ? `<p>${route.note}</p>` : ""
  ]
    .filter(Boolean)
    .join("");

  const steps = route.steps
    ? `
        <ol>
          ${route.steps.map((step) => `<li>${step}</li>`).join("")}
        </ol>
      `
    : "";

  return `
    <div class="map-popup">
      <h3>${route.name}</h3>
      <p><strong>${route.summary}</strong></p>
      ${details}
      ${steps}
    </div>
  `;
}

function buildFeaturedPlacePopup(place) {
  const categoryMeta = place.category
    ? placeCategoryStyles[place.category] || placeCategoryStyles.default
    : null;
  const details = [
    categoryMeta ? `<p><strong>Category:</strong> ${categoryMeta.label}</p>` : "",
    place.status ? `<p><strong>Status:</strong> ${place.status}</p>` : "",
    place.accessNote ? `<p>${place.accessNote}</p>` : "",
    place.hoursNote
      ? `<p><strong>${place.hoursLabel || "Office hours"}:</strong> ${place.hoursNote}</p>`
      : "",
    place.contact ? `<p><strong>Contact:</strong> ${place.contact}</p>` : "",
    place.sourceUrl
      ? `<p><a href="${place.sourceUrl}" target="_blank" rel="noreferrer">${place.sourceLabel || "Source"}</a></p>`
      : "",
    place.secondarySourceUrl
      ? `<p><a href="${place.secondarySourceUrl}" target="_blank" rel="noreferrer">${place.secondarySourceLabel || "Additional source"}</a></p>`
      : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <div class="map-popup">
      <h3>${place.name}</h3>
      <p><strong>${place.subtitle}</strong></p>
      <p>${place.description}</p>
      ${details}
    </div>
  `;
}

function buildMuralPopup(mural) {
  const details = [
    mural.description ? `<p>${mural.description}</p>` : "",
    mural.source ? `<p><strong>Source:</strong> ${mural.source}</p>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <div class="map-popup">
      <h3>${mural.name}</h3>
      ${details}
    </div>
  `;
}

function getPlaceMarkerStyle(category) {
  const categoryMeta = placeCategoryStyles[category] || placeCategoryStyles.default;

  return {
    categoryMeta,
    markerStyle: {
      radius: 8,
      color: "#fff9ef",
      weight: 2,
      fillColor: categoryMeta.color,
      fillOpacity: 0.95
    }
  };
}

function applyMarkerFilter(selectedFilter = "all") {
  markerLayer.clearLayers();
  featuredPlaceLayer.clearLayers();
  muralLayer.clearLayers();

  const showAllMarkers = selectedFilter === "all";

  if (showAllMarkers || selectedFilter === "timing-stops") {
    stopMarkers.forEach((marker) => {
      marker.addTo(markerLayer);
    });
  }

  if (showAllMarkers || selectedFilter === "public-art") {
    muralMarkers.forEach((marker) => {
      marker.addTo(muralLayer);
    });
  }

  featuredPlaceMarkers.forEach(({ marker, category }) => {
    if (showAllMarkers || selectedFilter === category) {
      marker.addTo(featuredPlaceLayer);
    }
  });
}

function renderPlaceLegend() {
  const legend = L.control({
    position: "topright"
  });

  legend.onAdd = () => {
    const container = L.DomUtil.create("div", "map-legend");
    const legendEntries = [
      {
        label: "Streetcar timing point",
        color: "#c48f2e"
      },
      ...[
        "public-art",
        "gallery",
        "maker-shop",
        "coffee-bakery",
        "restaurant",
        "landmark",
        "historic",
        "transit",
        "park"
      ].map((category) => {
        const item = placeCategoryStyles[category];
        return {
          label: item.label,
          color: item.color
        };
      })
    ]
      .map((item) => {
        return `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;">
            <span style="width:0.85rem;height:0.85rem;border-radius:50%;display:inline-block;background:${item.color};border:2px solid #fff9ef;"></span>
            <span>${item.label}</span>
          </div>
        `;
      })
      .join("");

    container.innerHTML = `
      <div style="background:rgba(255,249,239,0.96);border:1px solid rgba(19,111,99,0.18);border-radius:14px;padding:0.8rem 0.9rem;box-shadow:0 10px 26px rgba(18,34,29,0.14);font:500 0.85rem/1.4 Manrope, sans-serif;color:#17362d;">
        <strong style="display:block;margin-bottom:0.25rem;">Stop Types</strong>
        ${legendEntries}
      </div>
    `;

    L.DomEvent.disableClickPropagation(container);
    return container;
  };

  legend.addTo(map);
}

function buildRoute11Popup() {
  return `
    <div class="map-popup">
      <h3>${route11Magazine.name}</h3>
      <p><strong>${route11Magazine.summary}</strong></p>
      <p><strong>Terminals:</strong> ${route11Magazine.terminals}</p>
      <p>${route11Magazine.note}</p>
      <p>${route11Magazine.timingPoints}</p>
      <p>${route11Magazine.outboundPath}</p>
      <p>${route11Magazine.inboundPath}</p>
      <p><a href="https://s3.transitpdf.com/files/sourcedata/norta-regional.zip" target="_blank" rel="noreferrer">Current NORTA GTFS feed</a></p>
      <p><a href="https://www.norta.com/RTA/media/RTABusPDFSchedules/route_11.pdf" target="_blank" rel="noreferrer">Current Route 11 timetable</a></p>
      <p><a href="https://busmaps.com/en/united-states/new-orleans/rta-100412/line-11/2821996568" target="_blank" rel="noreferrer">Route path reference</a></p>
    </div>
  `;
}

function featureToLatLng(feature) {
  const [longitude, latitude] = feature.geometry.coordinates;
  return [latitude, longitude];
}

async function loadGeoJson(path) {
  if (bundledDataByPath[path]) {
    return bundledDataByPath[path];
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`);
  }

  return response.json();
}

function getWalkingRouteStyle(route, emphasized = false) {
  const baseOpacity = route.alwaysVisible ? 0.58 : 0.18;
  const baseWeight = route.alwaysVisible ? 5 : 4;

  return {
    color: route.color,
    weight: emphasized ? 7 : baseWeight,
    opacity: emphasized ? 0.92 : baseOpacity,
    dashArray: route.dashArray ?? (route.alwaysVisible ? "14 8" : "10 8"),
    lineCap: "round",
    lineJoin: "round"
  };
}

function openWalkingRoutePopup(routeName) {
  const anchorLayer = routePopupAnchorsByName.get(routeName);
  if (anchorLayer) {
    anchorLayer.openPopup();
  }
}

function createWalkingRouteLayer(route) {
  const layerGroup = L.geoJSON(route.geoJson, {
    style: getWalkingRouteStyle(route)
  }).addTo(map);

  layerGroup.eachLayer((childLayer) => {
    childLayer.bindPopup(buildRoutePopup(route));
    childLayer.on("click", () => {
      focusWalkingRoute(route);
    });

    if (!routePopupAnchorsByName.has(route.name)) {
      routePopupAnchorsByName.set(route.name, childLayer);
    }
  });

  return layerGroup;
}

function setWalkingRouteStyle(route, emphasized = false) {
  const layer = routeLayersByName.get(route.name);
  if (!layer) {
    return;
  }

  layer.setStyle(getWalkingRouteStyle(route, emphasized));
}

function focusWalkingRoute(route) {
  const layer = routeLayersByName.get(route.name);
  if (!layer) {
    return;
  }

  if (activeWalkingRoute && activeWalkingRoute !== route.name) {
    const previousRoute = walkingRoutes.find(
      (candidateRoute) => candidateRoute.name === activeWalkingRoute
    );
    if (previousRoute) {
      setWalkingRouteStyle(previousRoute);
    }
  }

  const isSameRoute = activeWalkingRoute === route.name;

  if (isSameRoute) {
    setWalkingRouteStyle(route);
    activeWalkingRoute = null;
  } else {
    setWalkingRouteStyle(route, true);
    activeWalkingRoute = route.name;
    openWalkingRoutePopup(route.name);
    map.fitBounds(layer.getBounds(), {
      padding: [36, 36]
    });
  }

  document.querySelectorAll(".route-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.routeName === activeWalkingRoute);
  });
}

function setActiveStopCard(stopName) {
  document.querySelectorAll(".stop-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.stopName === stopName);
  });
}

function formatRange([minMinutes, maxMinutes]) {
  if (minMinutes === maxMinutes) {
    return `${minMinutes}`;
  }

  return `${minMinutes}-${maxMinutes}`;
}

function buildMatrix(stationList, segmentRanges) {
  const table = document.createElement("table");
  table.className = "matrix-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "From \\ To";
  headRow.appendChild(corner);

  stationList.forEach((stop) => {
    const th = document.createElement("th");
    th.textContent = stop.name;
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  stationList.forEach((origin, rowIndex) => {
    const row = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    rowHeader.textContent = origin.name;
    row.appendChild(rowHeader);

    stationList.forEach((destination, columnIndex) => {
      const cell = document.createElement("td");

      if (rowIndex === columnIndex) {
        cell.textContent = "0";
      } else if (columnIndex < rowIndex) {
        cell.textContent = "—";
        cell.classList.add("is-empty");
      } else {
        const total = segmentRanges
          .slice(rowIndex, columnIndex)
          .reduce(
            (accumulator, currentRange) => [
              accumulator[0] + currentRange[0],
              accumulator[1] + currentRange[1]
            ],
            [0, 0]
          );

        cell.textContent = formatRange(total);
      }

      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return table;
}

function focusStop(stop) {
  const marker = markersByStop.get(stop.name);
  if (!marker) {
    return;
  }

  if (!map.hasLayer(marker)) {
    if (markerFilterSelect) {
      markerFilterSelect.value = "all";
    }
    applyMarkerFilter("all");
  }

  map.flyTo(stop.coordinates, 15, {
    duration: 0.8
  });
  marker.openPopup();
  setActiveStopCard(stop.name);
}

function renderStops(stops) {
  stops.forEach((stop) => {
    const marker = L.circleMarker(stop.coordinates, {
      radius: 9,
      color: "#fff9ef",
      weight: 2,
      fillColor: "#c48f2e",
      fillOpacity: 0.95
    })
      .bindPopup(buildStopPopup(stop))
      .addTo(markerLayer);

    markersByStop.set(stop.name, marker);
    stopMarkers.push(marker);

    marker.on("click", () => {
      focusStop(stop);
    });

    if (!stopList) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "stop-card";
    button.dataset.stopName = stop.name;
    button.setAttribute("role", "listitem");
    button.innerHTML = `
      <h3>${stop.order}. ${stop.name}</h3>
      <p class="stop-subtitle">${stop.subtitle}</p>
      <p>${stop.description}</p>
    `;
    button.addEventListener("click", () => {
      focusStop(stop);
    });
    stopList.appendChild(button);
  });
}

function renderWalkingRoutes(routes) {
  if (!routeList || routes.length === 0) {
    return;
  }

  routes.forEach((route) => {
    const layer = createWalkingRouteLayer(route);
    routeLayersByName.set(route.name, layer);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "route-chip";
    button.dataset.routeName = route.name;
    button.style.setProperty("--route-color", route.color);
    button.textContent = route.label || route.name;
    button.title = route.summary;
    if (route.alwaysVisible) {
      button.classList.add("is-pinned");
    }
    button.addEventListener("click", () => {
      focusWalkingRoute(route);
    });
    routeList.appendChild(button);
  });
}

function renderFeaturedPlaces() {
  featuredPlaces.forEach((place) => {
    const { markerStyle } = getPlaceMarkerStyle(place.category);
    const marker = L.circleMarker(place.coordinates, markerStyle).bindPopup(
      buildFeaturedPlacePopup(place)
    );

    marker.bindTooltip(place.name);
    featuredPlaceMarkers.push({
      marker,
      category: place.category || "default"
    });
  });
}

function renderMurals(muralData) {
  const { markerStyle } = getPlaceMarkerStyle("public-art");

  muralData.features.forEach((feature) => {
    const mural = {
      ...feature.properties,
      coordinates: featureToLatLng(feature)
    };

    const marker = L.circleMarker(mural.coordinates, {
      ...markerStyle,
      radius: 7
    }).bindPopup(buildMuralPopup(mural));

    marker.bindTooltip(mural.name);
    muralMarkers.push(marker);
  });
}

function renderRoute11GuideLayer(routeGeometry) {
  route11GuideLayer = L.geoJSON(routeGeometry, {
    style: (feature) => ({
      color: "#234d9b",
      weight: 4,
      opacity: 0.82,
      dashArray: feature?.properties?.direction === "Inbound" ? "10 6" : null,
      lineCap: "round",
      lineJoin: "round"
    })
  }).addTo(map);

  route11GuideLayer.eachLayer((layer) => {
    const direction = layer.feature?.properties?.direction;
    layer.bindPopup(buildRoute11Popup());
    layer.bindTooltip(
      direction ? `Route 11 (${direction})` : "Route 11 (Magazine)"
    );
  });
}

function renderServiceFrequencies(stops) {
  serviceFrequencies.forEach((item) => {
    const card = document.createElement("article");
    card.className = "frequency-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.body}</p>
    `;
    frequencyList.appendChild(card);
  });

  outboundMatrix.appendChild(buildMatrix(stops, outboundSegmentRanges));
  inboundMatrix.appendChild(buildMatrix([...stops].reverse(), inboundSegmentRanges));
}

function renderBaseLayers(lineData, boundaryData) {
  routeLine = L.geoJSON(lineData, {
    style: {
      color: "#136f63",
      weight: 6,
      opacity: 0.88,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  gardenDistrictLayer = L.geoJSON(boundaryData, {
    style: {
      color: "#8c5e34",
      weight: 3,
      opacity: 0.9,
      fillColor: "#c48f2e",
      fillOpacity: 0.12,
      dashArray: "8 6"
    }
  }).addTo(map);

  gardenDistrictLayer.eachLayer((layer) => {
    const feature = layer.feature;
    layer.bindPopup(
      `
        <div class="map-popup">
          <h3>${feature.properties.name}</h3>
          <p>${feature.properties.description}</p>
        </div>
      `
    );
    layer.bindTooltip("Garden District", {
      permanent: false,
      direction: "center"
    });
  });
}

function fitInitialBounds(routes) {
  const pinnedWalkingRouteLayers = routes
    .filter((route) => route.alwaysVisible)
    .map((route) => routeLayersByName.get(route.name))
    .filter(Boolean);

  const visibleLayers = [
    routeLine,
    gardenDistrictLayer,
    route11GuideLayer,
    ...pinnedWalkingRouteLayers,
    ...markerLayer.getLayers(),
    ...featuredPlaceLayer.getLayers(),
    ...muralLayer.getLayers()
  ].filter(Boolean);

  if (visibleLayers.length > 0) {
    map.fitBounds(L.featureGroup(visibleLayers).getBounds(), {
      padding: [36, 36]
    });
  }
}

async function initMapData() {
  try {
    const [
      stopData,
      lineData,
      boundaryData,
      muralData,
      ...routeGeoJsonData
    ] = await Promise.all([
      loadGeoJson(stCharlesStopsPath),
      loadGeoJson(stCharlesLinePath),
      loadGeoJson(gardenDistrictBoundaryPath),
      loadGeoJson(muralsPath),
      ...walkingRoutes.map((route) => loadGeoJson(route.geoJsonPath))
    ]);

    loadedStops = stopData.features
      .slice()
      .sort((left, right) => left.properties.order - right.properties.order)
      .map((feature) => ({
        ...feature.properties,
        coordinates: featureToLatLng(feature)
      }));

    const loadedRoutes = walkingRoutes.map((route, index) => ({
      ...route,
      geoJson: routeGeoJsonData[index]
    }));

    renderBaseLayers(lineData, boundaryData);
    renderStops(loadedStops);
    renderWalkingRoutes(loadedRoutes);
    renderRoute11GuideLayer(route11GuideGeoJson);
    renderFeaturedPlaces();
    renderMurals(muralData);
    applyMarkerFilter(markerFilterSelect?.value || "all");
    renderPlaceLegend();
    renderServiceFrequencies(loadedStops);
    fitInitialBounds(loadedRoutes);

    if (loadedStops.length > 0) {
      const firstStopMarker = markersByStop.get(loadedStops[0].name);
      if (firstStopMarker) {
        firstStopMarker.openPopup();
        setActiveStopCard(loadedStops[0].name);
      }
    }
  } catch (error) {
    console.error("Failed to initialize map data.", error);
    if (stopList) {
      stopList.innerHTML =
        '<p class="matrix-note">Map data failed to load. Check that all site files are present and refresh the page.</p>';
    }
    if (routeList) {
      routeList.innerHTML =
        '<p class="matrix-note">Route overlays could not be loaded. Check that the bundled data file and script file are both loading.</p>';
    }
  }
}

if (markerFilterSelect) {
  markerFilterSelect.addEventListener("change", (event) => {
    applyMarkerFilter(event.target.value);
  });
}

window.addEventListener("load", () => {
  initMapData();
});
