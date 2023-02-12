import {eksCluster, eksClusterOptions} from "./eks"

const kubernetesOptions: eksClusterOptions = {
    name: "eks-cluster",
    version: "1.21",
    vpcId: "vpc-03f526928a25165bd",
    privateSubnetsIds: ["subnet-011cc70e47f085d6c", "subnet-0c08b0acd2f48b3e2", "subnet-04693833acb34c936"],
    publicSubnetIds: ["subnet-0a3cb7db109daefa6", "subnet-01bca8d9439ab584d", "subnet-0293e701f8fe2f5b2"]
}

const kubernetes: eksCluster = new eksCluster("eksCluster", kubernetesOptions);