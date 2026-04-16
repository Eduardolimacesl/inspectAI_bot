export type LocationNode = {
  [key: string]: string[] | LocationNode;
};

export const BUILDINGS_CONFIG: LocationNode = {
  "Campus ITA-FZ": {
    "Bloco de Engenharias": {
      "Térreo": {
        "Ala Esquerda (Engenharia de Energias)": [
          "APOIO TÉCNICO",
          "ARMAZENAMENTO",
          "CASA DE MÁQUINAS",
          "CIRCULAÇÃO",
          "CIRCULAÇÃO SERVIÇO",
          "COPA",
          "DML SERVIÇO",
          "ESCADA",
          "JARDIM",
          "LABORATÓRIO DE COMBUSTÃO E MÁQUINAS TÉRMICAS",
          "LABORATÓRIO DE ELÉTRICA",
          "LABORATÓRIO DE ENERGIAS RENOVÁVEIS",
          "LABORATÓRIO DE FENÔMENOS DE TRANSPORTE",
          "LABORATÓRIO DE MATERIAIS",
          "LABORATÓRIO DE MECÂNICA",
          "LABORATÓRIO DIDÁTICO",
          "SHAFT",
          "VESTIÁRIO FEMININO",
          "VESTIÁRIO MASCULINO",
          "WC FEMININO",
          "WC MASCULINO",
          "WC PCD"
        ],
        "Ala Central (Núcleo de Apoio)": [
          "JARDIM",
          "LOJA 01",
          "LOJA 02",
          "SALA QGBT",
          "SALA TÉCNICA",
          "SHAFT",
          "WC FEMININO",
          "WC MASCULINO",
          "WC PCR"
        ],
        "Ala Direita (Engenharia de Sistemas)": [
          "ALMOXARIFADO",
          "APOIO TÉCNICO",
          "CASA DE MÁQUINAS",
          "CIRCULAÇÃO",
          "CLUSTERS E SERVIDORES",
          "ESCADA",
          "JARDIM",
          "LABORATÓRIO DE ARQUITETURA DE SISTEMAS 01",
          "LABORATÓRIO DE ARQUITETURA DE SISTEMAS 02",
          "LABORATÓRIO DE DESENVOLVIMENTO DE INTERFACES DE OPERAÇÃO DE SISTEMAS",
          "LABORATÓRIO DE ENGENHARIA DIGITAL",
          "LABORATÓRIO DE SISTEMAS 01",
          "LABORATÓRIO DE SISTEMAS 02",
          "LABORATÓRIO DE SISTEMAS 03",
          "LABORATÓRIO DE SISTEMAS DE CIDADES INTELIGENTES",
          "LABORATÓRIO INSTRUMENTADO PARA MOVIMENTAÇÃO EM ESPAÇO FÍSICO",
          "SALA TI",
          "SHAFT"
        ]
      },
      "1º Pavimento": ["Sala 201", "Sala 202", "Auditório"],
      "2º Pavimento": ["Sala 301", "Sala 302", "Auditório"],
      "Cobertura": ["Setor A", "Setor B", "Setor C"]
    },
    "Bloco de Alojamentos": {
      "TÉRREO": [
        "APARTAMENTO PCD 1",
        "APARTAMENTO PCD 2",
        "CICLOVIA",
        "BICICLETÁRIO",
        "SALA DE AULA",
        "ESCADA TÉRREO",
        "SALA TÉCNICA",
        "BANHEIRO 1",
        "HALL BANHEIRO",
        "BANHEIRO 2",
        "ÁREA DE CONVIVÊNCIA",
        "SALA DE INICIATIVA 1",
        "SALA DE INICIATIVA 2",
      ],
      "PRIMEIRO PAVIMENTO": [
        "APARTAMENTO 1",
        "APARTAMENTO 2",
        "APARTAMENTO 3",
        "APARTAMENTO 4",
        "APARTAMENTO 5",
        "HALL DE ENTRADA",
        "APARTAMENTO 6",
        "APARTAMENTO 7",
        "APARTAMENTO 8",
        "APARTAMENTO 9",
        "APARTAMENTO 10",
      ],
      "SEGUNDO PAVIMENTO": [
        "APARTAMENTO 11",
        "APARTAMENTO 12",
        "APARTAMENTO 13",
        "APARTAMENTO 14",
        "APARTAMENTO 15",
        "HALL DE ENTRADA",
        "APARTAMENTO 16",
        "APARTAMENTO 17",
        "APARTAMENTO 18",
        "APARTAMENTO 19",
        "APARTAMENTO 20"
      ],
      "COBERTURA": [
        "TELHAMENTO",
        "RESERVATÓRIOS",
      ],
      "INFRAESTRUTURAS": [
        "ESTRUTURAS",
        "PLUVIAL",
        "LÓGICA",
        "ELÉTRICA",
        "SPDA",
        "HIDROSSANITÁRIA",
        "CFTV"
      ],
      "OUTROS ELEMENTOS": [
        "ESCADA",
        "ESCADA MARINHEIRO",
        "PAISAGISMO",
        "PISO PODOTÁTIL",
        "COMUNICAÇÃO VISUAL E SINALIZAÇÃO",
        "COBOGÓS",
        "GUARDA-CORPO"
      ]
    }
  },
  "BAFZ": {
    "CO-FZ": {
      "Térreo": ["RH", "Financeiro"]
    },
    "BLOCO ADM": {
      "Térreo": ["RH", "Financeiro"]
    }
  }
};
