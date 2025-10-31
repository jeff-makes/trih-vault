export interface SeriesOverride {
  seriesId: string;
  episodeIds: string[];
  seriesKeyRaw?: string;
}

export const SERIES_OVERRIDES: SeriesOverride[] = [
  {
    seriesId: "crucifixion-20220414",
    episodeIds: [
      "6255ac88ccddaf001242e939",
      "625c93bac030a00012e354af",
      "626045214371e200121f227d"
    ]
  },
  {
    seriesId: "londinium-20220718",
    episodeIds: [
      "62d170ec2159da0013480026",
      "62d176dcdbfc6f0013bdf659",
      "62d179983d9a85001430cee0",
      "62d17f064a18060014379d6a",
      "62d18180c13efe0012aa7e82"
    ]
  },
  {
    seriesId: "the-battle-of-stalingrad-20220725",
    episodeIds: ["62ddadd6519edb001486d1a7", "62e1b0d942893c0012aa3bac"]
  },
  {
    seriesId: "theodora-20220808",
    episodeIds: [
      "62ed3d6221b3c50012565b9a",
      "62f14538efc11c00135927f6",
      "62f28b64c8c50f00132f0da1"
    ]
  },
  {
    seriesId: "young-cleopatra-20220613",
    episodeIds: [
      "62a333e6ca364e00134d572f",
      "62a3366843f27e00128e0b0e",
      "62a3375c25c70a001567ac7c",
      "62a339bc43f27e00128e185c"
    ]
  },
  {
    seriesId: "medieval-treason-20221031",
    episodeIds: ["635bf48be3fc63001259fbd9", "635bf4fee3fc63001259fcc5"]
  },
  {
    seriesId: "the-rise-of-the-nazis-20230116",
    episodeIds: [
      "63c19dbd65ae3d0011250e87",
      "63c1a02d2c423400110aeb08",
      "63c1a635b7b4a200112aa36d",
      "63c3f6b12c4234001171c24b"
    ]
  },
  {
    seriesId: "ronald-reagan-and-the-american-dream-20230306",
    episodeIds: [
      "6404e51ac5ea8c001181a5ef",
      "64089bde72ee7900114203af",
      "640b53e4f0fc0e0011cf3047"
    ]
  },
  {
    seriesId: "columbus-the-adventure-begins-20230220",
    episodeIds: [
      "63efc712743d6200118863e4",
      "63f3a9771a630700112ccb59",
      "63f3aa7e89ef5c0011b493bf",
      "63f3abab1a630700112d3c77"
    ]
  },
  {
    seriesId: "coronations-the-deep-history-20230504",
    episodeIds: [
      "6452b6e19dcdc1001174cf6d",
      "6453e7d37f1afb0011fb311e",
      "64554befd401890011b7c915"
    ],
    seriesKeyRaw: "Coronations"
  },
  {
    seriesId: "fall-of-saigon-the-nightmare-begins-20230424",
    episodeIds: ["6442c14d425b310011725061", "6442c36b7301040011d79e71"]
  },
  {
    seriesId: "hundred-years-war-a-game-of-thrones-20230403",
    episodeIds: [
      "6426f746a5f38c0011eea27a",
      "6426f8a31ea7060011bb863f",
      "64270783de6a3f00119e1812",
      "642708cbde6a3f00119e65c1"
    ]
  },
  {
    seriesId: "ireland-celts-conquest-and-cromwell-20230529",
    episodeIds: [
      "6473701e087bf40011b9ef0f",
      "64782f155fac2500113499f2",
      "647cf4d23863bd0011257cab",
      "647cfd4d36fc35001122dd13"
    ]
  },
  {
    seriesId: "jesus-christ-the-mystery-20221219",
    episodeIds: ["639f5f5efff9190011ac5f15", "639f616fb0a82100109516e4"]
  },
  {
    seriesId: "lady-jane-grey-the-nine-days-queen-20230109",
    episodeIds: ["63b81dfea8a1ca0010cd0a26", "63b81ee6cddc410011e2e003"]
  },
  {
    seriesId: "the-trial-of-charles-i-20220127",
    episodeIds: ["61f16dbccb2c6b00128636df", "61f17722f07dcd001272a3ad"]
  },
  {
    seriesId: "the-peasants-revolt-20240129",
    episodeIds: [
      "58ba519c-bc43-11ee-9835-db03853888d6",
      "b8076d84-bc42-11ee-b756-b337b9686287",
      "8c04792e-bc43-11ee-a68c-6feda6df087e",
      "f26ae1f8-bc43-11ee-8e46-17076e75f220"
    ],
    seriesKeyRaw: "The Peasants' Revolt"
  },
  {
    seriesId: "the-princes-in-the-tower-20220117",
    episodeIds: ["61e45de190c70c0012660174", "61e55ed08ed56f0012142796"]
  },
  {
    seriesId: "amsterdam-miracles-money-and-mud-20230717",
    episodeIds: ["ba533632-24cf-11ee-bc71-7ba075e7572b", "25d47922-2659-11ee-bc86-23235f3baaff"]
  },
  {
    seriesId: "paris-1968-the-students-revolt-20230724",
    episodeIds: ["8d9e7490-2929-11ee-a578-c377727a80e1", "2f465baa-2be6-11ee-8255-7f60fd330075"]
  },
  {
    seriesId: "oppenheimer-the-father-of-the-atom-bomb-20230622",
    episodeIds: ["6492e387895f9d00117a5252", "64944458a82eee00116dc219"]
  },
  {
    seriesId: "world-cup-of-kings-and-queens-part-1-20211122",
    episodeIds: ["f1d7f9c9-a246-4903-b310-d73754d45bc6", "f7edc2b0-2055-4996-b07e-dc30fb1c48e5"],
    seriesKeyRaw: "World Cup of Kings and Queens"
  },
  {
    seriesId: "alexander-the-great-part-1-20211108",
    episodeIds: ["269b1ed6-0191-4725-9d4f-de6328d2c323", "351a6b8d-8ee4-495f-a780-a0a6d90eac80"],
    seriesKeyRaw: "Alexander the Great"
  },
  {
    seriesId: "american-civil-war-the-causes-20220627",
    episodeIds: [
      "62b1aed0c7aea90012713821",
      "62b1b082ab73180012ade1fc",
      "62b1b21ccdd8c80011eefc7f",
      "62b1b3443369580012832fa0"
    ],
    seriesKeyRaw: "American Civil War"
  },
  {
    seriesId: "the-american-revolution-20230703",
    episodeIds: [
      "64a1d563f23f0b001160b0f1",
      "64a53520ca46640010d45fa6",
      "64a80849a1be3e00114c5dc4",
      "64a80b29d5d98f0011442874"
    ]
  },
  {
    seriesId: "the-trials-of-oscar-wilde-sex-and-scandal-20230615",
    episodeIds: ["6489e62a9bdbb900115879c9", "6489e6e49bdbb9001158919c"]
  },
  {
    seriesId: "ancient-carthage-20240219",
    episodeIds: [
      "44fd67b0-cc1b-11ee-a76b-1f473ed7eb9a",
      "d52dcf36-cc1c-11ee-9576-2b961b812eb2",
      "1091daf4-cc1d-11ee-b84f-0f850e9d20ac",
      "6347d3de-cc1d-11ee-b146-6fc74d0f25b8"
    ]
  },
  {
    seriesId: "custer-vs-crazy-horse-20240505",
    episodeIds: [
      "cadccf14-07d6-11ef-9885-bfb7cb522bf8",
      "331ec726-07d7-11ef-b346-5f270c926112",
      "6dcd8006-07d7-11ef-8ff5-b33ac7aac8cb",
      "85db75ea-07d7-11ef-9454-bb8cb79cf1bf",
      "89f1cbf2-0c55-11ef-a8ea-0350eba44397",
      "3f55980a-0d2a-11ef-b71d-2b611308c700",
      "3e1bf360-163c-11ef-b0e7-970acae362a9",
      "d044d542-0e06-11ef-84be-db5182840b12"
    ]
  },
  {
    seriesId: "mad-elections-20240623",
    episodeIds: ["88469588-2e2b-11ef-8e7c-afeeeca1e50e", "f7628c7e-2f11-11ef-915b-47d256ff57ad"]
  },
  {
    seriesId: "history-s-greatest-beards-20240908",
    episodeIds: ["d69368de-6c69-11ef-b577-f35add320ac8", "d390da76-6e8b-11ef-9436-d7e1a56f1e24"]
  }
];
