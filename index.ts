import {eksCluster, eksClusterOptions} from "./eks"

const kubernetesOptions: eksClusterOptions = {
    name: "eks-cluster",
    version: "1.23",
    vpcId: "vpc-0d4cd3e882b183157",
    privateSubnetsIds: ["subnet-0091994d32ebbdf93", "subnet-0afe5e4d35482ae75", "subnet-02c31f28851cd474a"],
    publicSubnetIds: ["subnet-0fc39c184e042486a", "subnet-0aa8a3aebbe0f82a7", "subnet-026e663b20e7d0f7d"]
}

const kubernetes: eksCluster = new eksCluster("eksCluster", kubernetesOptions);