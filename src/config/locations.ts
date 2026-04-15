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
      "Pavimento Térreo": [
        "A.S. 1",
        "A.S. 2",
        "A.S. 3",
        "A.S. PCD 1",
        "A.S. PCD 2",
        "BANH. 1",
        "BANH. 2",
        "BANH. 3",
        "BANH. PCD 1",
        "BANH. PCD 2",
        "BANHEIRO 1",
        "BANHEIRO 2",
        "BICICLETÁRIO",
        "ESTAR/COZINHA 1",
        "ESTAR/COZINHA 2",
        "ESTAR/COZINHA PCD 1",
        "ESTAR/COZINHA PCD 2",
        "HALL BANHEIRO",
        "HALL DE ACESSO",
        "QUARTO 1",
        "QUARTO 2",
        "QUARTO 3",
        "QUARTO PCD 1",
        "QUARTO PCD 2",
        "QUARTO PCD 3",
        "QUARTO PCD 4",
        "SALA DE AULA",
        "SALA DE INICIATIVA 1",
        "SALA DE INICIATIVA 2",
        "SALA TÉCNICA",
        "ÁREA DE CONVIVÊNCIA"
      ],
        "Pavimento Tipo": [
        "A.S. 4", "A.S. 5", "A.S. 6", "A.S. 7", "A.S. 8", "A.S. 9", "A.S. 10", 
        "A.S. 11", "A.S. 12", "A.S. 13", "A.S. 14", "A.S. 15", "A.S. 16", "A.S. 17", 
        "A.S. 18", "A.S. 19", "A.S. 20",
        "BANH. 4", "BANH. 5", "BANH. 6", "BANH. 7", "BANH. 8", "BANH. 9", "BANH. 10", 
        "BANH. 11", "BANH. 12", "BANH. 13", "BANH. 14", "BANH. 15", "BANH. 16", 
        "BANH. 17", "BANH. 18", "BANH. 19", "BANH. 20",
        "ESTAR/COZINHA 3", "ESTAR/COZINHA 4", "ESTAR/COZINHA 5", "ESTAR/COZINHA 6", 
        "ESTAR/COZINHA 7", "ESTAR/COZINHA 8", "ESTAR/COZINHA 9", "ESTAR/COZINHA 20",
        "HALL DE ENTRADA",
        "QUARTO 4", "QUARTO 5", "QUARTO 6", "QUARTO 7", "QUARTO 8", "QUARTO 9", 
        "QUARTO 10", "QUARTO 11", "QUARTO 12", "QUARTO 13", "QUARTO 14", "QUARTO 15", 
        "QUARTO 16", "QUARTO 17", "QUARTO 18", "QUARTO 19", "QUARTO 20"
      ],
      "Cobertura": ["Ala Esquerda", "Ala Central", "Ala Direita", "Barrilete", "CXDG"]
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
