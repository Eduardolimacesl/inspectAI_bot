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
      "Térreo": [
        "Recepção", "Refeitório", "Lavanderia"],
      "1º Pavimento": ["Suíte 10", "Suíte 11"],
      "2º Pavimento": ["Suíte 20", "Suíte 21"]
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
