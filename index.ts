import {eksCluster, eksClusterOptions} from "./eks"

const kubernetesOptions: eksClusterOptions = {
    name: "eks-cluster",
    version: "1.23",
    vpcId: "vpc-09344b0dc556d1e09",
    privateSubnetsIds: ["subnet-0e2c701824dc2908c", "subnet-0991f903c900b6857", "subnet-07be7e83f29e38183"],
    publicSubnetIds: ["subnet-0043b56dcbc4b5ffe", "subnet-0f368f48add9fc6aa", "subnet-06430837e9e2272fe"]
}

const kubernetes: eksCluster = new eksCluster("eksCluster", kubernetesOptions);